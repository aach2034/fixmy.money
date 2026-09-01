'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, User, Building2, FileText, AlertTriangle, CheckCircle2, Paperclip, Send, Clock, Info, Loader2 } from 'lucide-react';

import { useSearchParams } from 'next/navigation';
import { scoreDisputeStrength } from '@/lib/creditReport/auditItems';
import { deduplicateDisputeRows, getDisputeItemDates } from '@/lib/creditReport/disputeItems';
import { DISPUTE_REASON_OPTIONS, rankDisputeItem } from '@/lib/disputes/reasonRanking';
import { buildConsumerSenderBlock, formatMissingMailingAddressError, getLetterSenderInfo, normalizeClientMailingAddress, toCanonicalMailingAddressUpdate } from '@/lib/disputes/letterSender';
import { formatAnomalyFindingsForLetter, prepareAnomalyFindings, type AnomalyFindingView } from '@/lib/disputes/anomalyFindings';
import { CORRECTION_FIRST_REQUESTED_ACTION, deduplicateSupportingDocuments, formatAccountType } from '@/lib/disputes/letterPresentation';
import { trackEvent, trackOrganicConversionStep } from '@/lib/analytics';


interface WizardClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}
interface WizardDisputeItem {
  id: string;
  label: string;
  type: string;
  amount: string;
  bureau: string;
  disputeReason: string;
  rankingReason: string;
  creditorName: string;
  accountNumber: string;
  dateOpened: string;
  dateReported: string;
  dateLastActivity: string;
  disputeStrengthScore: number;
  strengthLabel: 'Strong' | 'Moderate' | 'Weak';
  strongestAnomaly: string;
  reportedDataSummary: string;
  recommendationReason: string;
  disputeBasis: string;
  isRecommended: boolean;
  findings: AnomalyFindingView[];
  source: 'negative_items' | 'client_disputes';
}

const accountDateSummary = (item: Pick<WizardDisputeItem, 'dateOpened' | 'dateReported' | 'dateLastActivity'>) => [
  item.dateOpened && `Opened: ${item.dateOpened}`,
  item.dateReported && `Reported: ${item.dateReported}`,
  item.dateLastActivity && `Last activity: ${item.dateLastActivity}`,
].filter(Boolean).join(' | ');

const BUREAUS = ['Equifax', 'Experian', 'TransUnion'];

const WIZARD_REASON_VALUES = [
  'Not my account',
  'Account paid in full',
  'Account settled',
  'Incorrect balance',
  'Incorrect payment history',
  'Duplicate account',
  'Account included in bankruptcy',
  'Fraudulent account / identity theft',
  'Incorrect account status',
  'Incorrect date of last activity',
  'Incorrect date opened',
  'Incorrect personal information',
  'Unauthorized inquiry',
  'Debt past statute of limitations',
  'No signed agreement / contract',
  'Other (specify in notes)',
];
const DISPUTE_REASONS = DISPUTE_REASON_OPTIONS.filter(option => WIZARD_REASON_VALUES.includes(option.value));

const INSTRUCTIONS = [
  CORRECTION_FIRST_REQUESTED_ACTION,
  'Delete this item from my credit report',
  'Provide method of verification',
  'Validate this debt',
  'Remove unauthorized inquiry',
  'Update account status to paid/closed',
  'Cease and desist all collection activity',
];

export const hasCompleteMailingAddress = (street: string, city: string, state: string, zip: string) =>
  !formatMissingMailingAddressError({ address: street, city, state, zip });

const STEPS = [
  { id: 1, label: 'Choose client', icon: User },
  { id: 2, label: 'Choose bureau', icon: Building2 },
  { id: 3, label: 'Choose findings', icon: FileText },
  { id: 4, label: 'Review recommendation', icon: AlertTriangle },
  { id: 5, label: 'Add details', icon: CheckCircle2 },
  { id: 6, label: 'Supporting documents', icon: Paperclip },
  { id: 7, label: 'Generate letters', icon: Send },
];

export default function DisputeWizardContent() {
  const searchParams = useSearchParams();
  const fromReport = searchParams.get('fromReport') === 'true';
  const preClientId = searchParams.get('clientId') ?? '';
  const preClientName = searchParams.get('clientName') ?? '';
  const preReportId = searchParams.get('reportId') ?? '';

  const [step, setStep] = useState(fromReport ? 2 : 1);
  const [clients, setClients] = useState<WizardClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [disputeItems, setDisputeItems] = useState<WizardDisputeItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<{ id: string; reference: string } | null>(null);

  useEffect(() => {
    trackEvent('dispute_wizard_started', { authenticated: true });
  }, []);

  // Wizard state
  const [selectedClient, setSelectedClient] = useState<WizardClient | null>(
    fromReport && preClientId ? { id: preClientId, name: preClientName } : null
  );
  const [selectedBureau, setSelectedBureau] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [disputeReason, setDisputeReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [instruction, setInstruction] = useState(CORRECTION_FIRST_REQUESTED_ACTION);
  const [attachedDocs, setAttachedDocs] = useState<string[]>([]);
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientZip, setClientZip] = useState('');
  const [round, setRound] = useState(1);
  const [notes, setNotes] = useState('');
  // Banner shown when arriving from report import
  const [fromReportBanner, setFromReportBanner] = useState(fromReport);
  const nextLabels: Record<number, string> = {
    1: 'Choose bureau',
    2: 'Choose findings',
    3: 'Review recommendation',
    4: 'Add request details',
    5: 'Choose supporting documents',
    6: 'Review letter',
  };

  const supabase = createClient();

  useEffect(() => {
    trackOrganicConversionStep('dispute_wizard_started');
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    const normalized = normalizeClientMailingAddress(selectedClient);
    setClientAddress([normalized.street, normalized.line2].filter(Boolean).join('\n'));
    setClientCity(normalized.city);
    setClientState(normalized.state);
    setClientZip(normalized.postalCode);
  }, [selectedClient]);

  useEffect(() => {
    const load = async () => {
      setClientsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('staff_clients')
          .select('id, name, email, phone, address, city, state, zip')
          .eq('owner_id', user.id)
          .order('name');
        setClients(data ?? []);

        // If pre-populated from report import, enrich the client object with email
        if (fromReport && preClientId && data) {
          const found = data.find((c: WizardClient) => c.id === preClientId);
          if (found) setSelectedClient(found);
        }
      } finally {
        setClientsLoading(false);
      }
    };
    load();
  }, []);

  // Load dispute items from negative_items table when client + bureau selected
  // If arriving from report import and a reportId is present, filter by that report
  useEffect(() => {
    if (!selectedClient || !selectedBureau) return;
    const load = async () => {
      setItemsLoading(true);
      setDisputeItems([]);
      setSelectedItems(new Set());
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Report imports are authoritative by report_id. Fetch the report rows
        // first, then normalize bureau values client-side; OCR/parser output can
        // contain casing differences or multi-bureau arrays that an exact SQL
        // bureau filter misses.
        let query = supabase
          .from('negative_items')
          .select('*')
          .eq('owner_id', user.id);

        if (fromReport && preReportId) {
          query = query.eq('report_id', preReportId);
        } else {
          query = query.eq('client_id', selectedClient.id);
        }

        const { data: reportRows, error: negativeError } = await query;
        if (negativeError) throw negativeError;

        const selectedBureauKey = selectedBureau.trim().toLowerCase();
        const belongsToSelectedBureau = (item: any) => {
          const bureaus = [item.bureau, ...(Array.isArray(item.bureaus_reporting) ? item.bureaus_reporting : [])]
            .filter(Boolean)
            .map((bureau: unknown) => String(bureau).trim().toLowerCase());
          return bureaus.includes(selectedBureauKey);
        };
        const filterRows = (rows: any[]) => rows.filter((item: any) => {
          const status = String(item.dispute_status ?? 'draft').toLowerCase();
          if (status === 'resolved') return false;

          const category = String(item.negative_category ?? '').toLowerCase();
          const isNegative = item.is_negative === true ||
            category === 'hard_inquiry' ||
            (category !== 'positive' && Boolean(item.negative_reason));
          if (!isNegative) return false;

          return true;
        });

        let negativeData = filterRows(reportRows ?? []);

        // Some historical imports have valid negative_items rows but a missing
        // or stale report_id. Fall back to the client's confirmed queue rather
        // than presenting an empty Wizard.
        if (!negativeData.some(belongsToSelectedBureau) && fromReport && preReportId) {
          const { data: clientRows, error: clientRowsError } = await supabase
            .from('negative_items')
            .select('*')
            .eq('owner_id', user.id)
            .eq('client_id', selectedClient.id);
          if (clientRowsError) throw clientRowsError;
          negativeData = filterRows(clientRows ?? []);
        }

        if (negativeData && negativeData.length > 0) {
          const scoredItems = deduplicateDisputeRows(scoreDisputeStrength(negativeData).filter(belongsToSelectedBureau));
          setDisputeItems(scoredItems.map((d: any) => ({
            id: d.id,
            label: `${d.creditor_name ?? 'Unknown'} — ${d.negative_category ?? 'Item'}`,
            type: d.negative_category ?? 'other',
            amount: d.balance ? `$${Number(d.balance).toLocaleString()}` : '—',
            bureau: d.bureau ?? '',
            disputeReason: d.dispute_reason ?? '',
            rankingReason: d.dispute_reason ?? d.negative_reason ?? '',
            creditorName: d.creditor_name ?? 'Unknown',
            accountNumber: d.account_number_masked ?? '',
            ...getDisputeItemDates(d),
            disputeStrengthScore: d.disputeStrength.dispute_strength_score,
            strengthLabel: d.disputeStrength.strengthLabel,
            strongestAnomaly: d.disputeStrength.strongestAnomaly,
            reportedDataSummary: d.disputeStrength.reportedDataSummary,
            recommendationReason: d.disputeStrength.recommendedReason,
            disputeBasis: d.disputeStrength.disputeBasis,
            isRecommended: d.disputeStrength.isRecommended,
            findings: prepareAnomalyFindings(d.disputeStrength.findings),
            source: 'negative_items',
          })));
          setSelectedItems(new Set(scoredItems.filter((item: any) => item.disputeStrength.isRecommended).map((item: any) => item.id)));
        } else {
          // Fallback: load from client_disputes table (legacy path)
          const { data: legacyData } = await supabase
            .from('client_disputes')
            .select('*')
            .eq('owner_id', user.id)
            .eq('client_id', selectedClient.id)
            .eq('bureau', selectedBureau)
            .not('dispute_status', 'eq', 'resolved');
          setDisputeItems(deduplicateDisputeRows(legacyData ?? []).map((d: any) => ({
            id: d.id,
            label: `${d.creditor_name ?? 'Unknown'} — ${d.negative_item_type ?? 'Item'}`,
            type: d.negative_item_type ?? 'other',
            amount: d.amount ? `$${Number(d.amount).toLocaleString()}` : '—',
            bureau: d.bureau ?? '',
            disputeReason: d.dispute_reason ?? '',
            rankingReason: d.dispute_reason ?? d.negative_reason ?? d.negative_item_type ?? '',
            creditorName: d.creditor_name ?? 'Unknown',
            accountNumber: d.account_number ?? '',
            ...getDisputeItemDates(d),
            disputeStrengthScore: 25,
            strengthLabel: 'Weak',
            strongestAnomaly: 'No factual anomaly detected',
            reportedDataSummary: '',
            recommendationReason: 'Legacy dispute item available for review; no imported report discrepancy was detected for ranking.',
            disputeBasis: d.dispute_reason ?? d.negative_reason ?? d.negative_item_type ?? 'Review the reported information for accuracy.',
            isRecommended: false,
            findings: [],
            source: 'client_disputes',
          })));
        }
      } catch (error: any) {
        console.error('[DisputeWizard] Failed to load dispute items:', error?.message ?? error);
        toast.error('Could not load dispute items. Please refresh and try again.');
        setDisputeItems([]);
      } finally {
        setItemsLoading(false);
      }
    };
    load();
  }, [selectedClient, selectedBureau]);

  const canProceed = () => {
    if (step === 1) return !!selectedClient;
    if (step === 2) return !!selectedBureau && !itemsLoading;
    if (step === 3) return selectedItems.size > 0;
    if (step === 4) return !!disputeReason && (disputeReason !== 'Other (specify in notes)' || customReason.trim().length >= 10);
    if (step === 5) return !!instruction;
    return true;
  };

  const handleGenerate = async () => {
    if (!selectedClient || !selectedBureau || selectedItems.size === 0) {
      toast.error('Missing required information');
      return;
    }
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const addressInput = { name: selectedClient.name, address: clientAddress, city: clientCity, state: clientState, zip: clientZip };
      const addressUpdate = toCanonicalMailingAddressUpdate(addressInput);
      if (!addressUpdate) throw new Error(formatMissingMailingAddressError(addressInput) ?? 'Client name is missing.');
      const { error: addressUpdateError } = await supabase
        .from('staff_clients')
        .update(addressUpdate)
        .eq('id', selectedClient.id)
        .eq('owner_id', user.id);
      if (addressUpdateError) throw new Error('Client mailing address could not be saved.');

      const { data: persistedClient, error: clientError } = await supabase
        .from('staff_clients')
        .select('id, name, email, phone, address, city, state, zip')
        .eq('id', selectedClient.id)
        .eq('owner_id', user.id)
        .single();
      if (clientError || !persistedClient) throw new Error('Selected client profile could not be refreshed.');

      const sender = getLetterSenderInfo(persistedClient);
      if (!sender) throw new Error(formatMissingMailingAddressError(persistedClient) ?? 'Client name is missing.');
      const normalizedAddress = normalizeClientMailingAddress(persistedClient);
      setSelectedClient(persistedClient);
      setClientAddress(normalizedAddress.street);
      setClientCity(normalizedAddress.city);
      setClientState(normalizedAddress.state);
      setClientZip(normalizedAddress.postalCode);

      const { data: workspace } = await supabase
        .from('workspaces').select('id').eq('owner_id', user.id).single();

      const bureauShort: Record<string, string> = { Equifax: 'EQ', Experian: 'EX', TransUnion: 'TU' };
      const shortCode = bureauShort[selectedBureau] ?? 'DL';
      const letterNum = Math.floor(Math.random() * 9000) + 1000;
      const letterId = `${shortCode}-${letterNum}`;

      const selectedDisputeItems = disputeItems.filter(i => selectedItems.has(i.id));
      const finalReason = disputeReason === 'Other (specify in notes)' ? customReason : disputeReason;

      const bureauAddresses: Record<string, string> = {
        Equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
        Experian: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
        TransUnion: 'TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016',
      };

      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const clientAddr = buildConsumerSenderBlock(sender);

      const itemsSection = selectedDisputeItems.map((item, i) => {
        const dates = accountDateSummary(item);
        const findings = formatAnomalyFindingsForLetter(item.findings);
        const hasDetectedEvidence = Boolean(item.reportedDataSummary && item.disputeBasis);
        const itemReason = hasDetectedEvidence ? item.disputeBasis : finalReason;
        const reportedData = item.reportedDataSummary ? `   Reported Data: ${item.reportedDataSummary}\n` : '';
        const factualBasis = hasDetectedEvidence ? item.disputeBasis : item.strongestAnomaly;
        return `Item ${i + 1}: ${item.creditorName}${item.accountNumber ? ` (Account: ****${item.accountNumber.slice(-4)})` : ''}
   Type: ${formatAccountType(item.type)} | Amount: ${item.amount}
   ${dates ? `Report Dates: ${dates}\n` : ''}${findings || `   Dispute Strength: ${item.strengthLabel}
   Discrepancy: ${item.strongestAnomaly}
${reportedData}   Factual Basis: ${factualBasis}
   Dispute Reason: ${itemReason}`}

   Requested Action: ${instruction}`;
      }).join('\n\n');

      const supportingDocuments = deduplicateSupportingDocuments([
        'Copy of government-issued photo ID',
        'Copy of proof of current address',
        ...attachedDocs,
      ]);

      const letterContent = `${clientAddr}

${today}

${bureauAddresses[selectedBureau] ?? selectedBureau}

Re: Formal Credit Dispute — Round ${round}
    Letter Reference: ${letterId}

To Whom It May Concern:

I am writing to formally dispute the following item(s) on my credit report pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i. I request that you investigate each item listed below within the applicable period required by the FCRA and correct or delete information that is unverifiable or otherwise required to be corrected or removed.

DISPUTED ITEM(S):

${itemsSection}

${notes ? `ADDITIONAL INFORMATION:\n${notes}\n` : ''}
SUPPORTING DOCUMENTS ENCLOSED:
${supportingDocuments.map(document => `• ${document}`).join('\n')}

Please send written confirmation of your investigation results to the address above. If you cannot verify the accuracy of the disputed information, you must promptly delete or correct it.

Sincerely,


_________________________________
${sender.name}
Date: ${today}`;

      const responseDueDate = new Date();
      responseDueDate.setDate(responseDueDate.getDate() + 30);

      const { data: savedLetter, error: insertError } = await supabase.from('dispute_letters').insert({
        owner_id: user.id,
        client_id: selectedClient.id,
        workspace_id: workspace?.id ?? null,
        letter_id: letterId,
        client_name: sender.name,
        bureau: selectedBureau,
        items_count: selectedItems.size,
        round,
        sent_date: null,
        response_due_date: null,
        days_remaining: 0,
        letter_status: 'draft',
        template: 'FCRA Section 611',
        auto_generated: false,
        letter_content: letterContent,
        generated_at: new Date().toISOString(),
      }).select('id, letter_id').single();

      if (insertError || !savedLetter?.id) throw new Error('We could not save the generated letter. Please try again.');

      const negativeItemIds = selectedDisputeItems
        .filter(item => item.source === 'negative_items')
        .map(item => item.id);
      if (negativeItemIds.length > 0) {
        const { error: statusError } = await supabase
          .from('negative_items')
          .update({ dispute_status: 'generated' })
          .in('id', negativeItemIds)
          .eq('owner_id', user.id);
        if (statusError) throw new Error('The letter was saved, but the selected items could not be marked as generated.');
      }

      // Auto-create follow-up task
      await supabase.from('workflow_tasks').insert({
        owner_id: user.id,
        client_id: selectedClient.id,
        title: `Follow up on ${selectedBureau} dispute — ${letterId}`,
        description: `Check bureau response for dispute letter ${letterId}. Response due: ${responseDueDate.toLocaleDateString()}.`,
        due_date: responseDueDate.toISOString(),
        status: 'pending',
        priority: 'medium',
        task_type: 'dispute_followup',
      }); // non-fatal: task creation does not block the generated letter

      setGeneratedLetter({ id: savedLetter.id, reference: savedLetter.letter_id ?? letterId });
      trackOrganicConversionStep('dispute_wizard_letter_generated', {
        bureau: selectedBureau,
        items_count: selectedItems.size,
      });
      trackEvent('letter_generated', {
        bureau: selectedBureau,
        items_count: selectedItems.size,
        authenticated: true,
      });
      toast.success(`Letter ${letterId} generated and ready to use`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate the letter. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (generatedLetter) {
    return (
      <div className="app-page max-w-2xl">
        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Letter Generated</h2>
          <p className="text-sm text-muted-foreground">
            Dispute letter <strong>{generatedLetter.reference}</strong> has been saved to Drafts for{' '}
            <strong>{selectedClient?.name}</strong> targeting <strong>{selectedBureau}</strong>.
          </p>
          <div className="flex items-start gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-left">
            <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <strong>No FixMy.Money approval is required.</strong> Your business must review the facts and consumer authorization before downloading, printing, or sending the letter.
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-left">
            <Clock size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary">
              A follow-up task has been automatically created for 30 days from today to track the bureau response deadline.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <a href={`/dispute-letter-management?draftId=${encodeURIComponent(generatedLetter.id)}`} className="btn-primary">View Draft Letter</a>
            <button onClick={() => { setStep(1); setGeneratedLetter(null); setSelectedClient(null); setSelectedBureau(''); setSelectedItems(new Set()); setDisputeReason(''); setInstruction(CORRECTION_FIRST_REQUESTED_ACTION); }} className="btn-secondary">Start New Dispute</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page page-stack max-w-4xl">
      <div>
        <p className="text-sm font-semibold text-green-700">Guided dispute workflow</p>
        <h1 className="page-title mt-2">Create your dispute letter</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Complete one clear step at a time. Your progress is saved as you go.</p>
      </div>

      {/* Banner shown when arriving from report import */}
      {fromReportBanner && selectedClient && (
        <div className="flex items-start justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary">
              <strong>{selectedClient.name}</strong> pre-selected from report import. Select a bureau below to load the parsed negative items for dispute.
            </p>
          </div>
          <button onClick={() => setFromReportBanner(false)} className="text-primary/60 hover:text-primary text-xs shrink-0">✕</button>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-primary text-white' : isDone ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                {isDone ? <CheckCircle2 size={12} /> : <StepIcon size={12} />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="card p-6 space-y-4">
        {/* Step 1: Select Client */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Select Client</h2>
            {clientsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 size={14} className="animate-spin" /> Loading clients…</div>
            ) : clients.length === 0 ? (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">No clients found. Add clients in Client Management first.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {clients.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedClient(c)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${selectedClient?.id === c.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                    {selectedClient?.id === c.id && <CheckCircle2 size={16} className="text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            )}
            {selectedClient && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground">Client mailing address for the letter header</p>
                <textarea rows={2} className="input-field resize-none" placeholder="Street address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="input-field" placeholder="City" value={clientCity} onChange={e => setClientCity(e.target.value)} />
                  <input className="input-field" placeholder="ST" maxLength={2} value={clientState} onChange={e => setClientState(e.target.value.toUpperCase())} />
                  <input className="input-field" placeholder="ZIP" value={clientZip} onChange={e => setClientZip(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Bureau */}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Select Credit Bureau</h2>
            {fromReport && selectedClient && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-foreground font-medium">{selectedClient.name}</p>
                <span className="text-xs text-muted-foreground ml-auto">from report import</span>
              </div>
            )}
            {fromReport && selectedClient && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Client mailing address required before generation</p>
                <textarea rows={2} className="input-field resize-none" placeholder="Street address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="input-field" placeholder="City" value={clientCity} onChange={e => setClientCity(e.target.value)} />
                  <input className="input-field" placeholder="ST" maxLength={2} value={clientState} onChange={e => setClientState(e.target.value.toUpperCase())} />
                  <input className="input-field" placeholder="ZIP" value={clientZip} onChange={e => setClientZip(e.target.value)} />
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Which bureau will receive this dispute letter?</p>
            <div className="grid grid-cols-3 gap-3">
              {BUREAUS.map(b => (
                <button key={b} type="button" onClick={() => setSelectedBureau(b)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${selectedBureau === b ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <p className="text-sm font-semibold text-foreground">{b}</p>
                  {selectedBureau === b && <CheckCircle2 size={14} className="text-primary mx-auto mt-1" />}
                </button>
              ))}
            </div>
            <div>
              <label className="label-text">Dispute round</label>
              <select className="input-field" value={round} onChange={e => setRound(Number(e.target.value))}>
                {[1, 2, 3, 4].map(r => <option key={r} value={r}>Round {r}</option>)}
              </select>
              <div className="flex items-start gap-2 mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Info size={13} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  {round === 1
                    ? 'Typically begin with a focused FCRA dispute that identifies the exact inaccurate information and includes supporting documents. Broad or unsupported requests are less useful.'
                    : 'For a follow-up, reference the earlier dispute and response, explain what was not addressed, and include new or previously overlooked evidence. Repeating the same letter alone is rarely the strongest next step.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Items */}
        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Select Dispute Items</h2>
            <p className="text-sm text-muted-foreground">Strong factual disputes are preselected when detected. Review, deselect, or add items before continuing.</p>
            {fromReport && preReportId && (
              <div className="flex items-start gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
                <Info size={12} className="shrink-0 mt-0.5" />
                Showing negative items parsed from the imported report. Select the accounts to include in this dispute letter.
              </div>
            )}
            {itemsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 size={14} className="animate-spin" /> Loading items…</div>
            ) : disputeItems.length === 0 ? (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                No open dispute items found for {selectedClient?.name} at {selectedBureau}. Add dispute items in Client Management or import a credit report.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[...disputeItems].sort((a, b) => {
                  if (b.disputeStrengthScore !== a.disputeStrengthScore) return b.disputeStrengthScore - a.disputeStrengthScore;
                  const aRank = rankDisputeItem(a.rankingReason, a.type).rank;
                  const bRank = rankDisputeItem(b.rankingReason, b.type).rank;
                  return aRank - bRank;
                }).map(item => {
                  const checked = selectedItems.has(item.id);
                  return (
                    <button key={item.id} type="button" onClick={() => {
                      setSelectedItems(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; });
                    }} className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                      {checked ? <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" /> : <div className="w-4 h-4 rounded border-2 border-muted-foreground shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Dispute Strength: {item.strengthLabel}</span>
                          {item.isRecommended && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Recommended</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.type} · {item.amount}</p>
                        {accountDateSummary(item) && <p className="mt-1 text-xs text-muted-foreground">{accountDateSummary(item)}</p>}
                        <div className="mt-2 space-y-2">
                          {item.findings.length > 0 ? item.findings.map((finding, index) => (
                            <div key={`${finding.issueType}-${finding.reportedData}`} className="rounded-md border border-border/70 bg-background/60 p-2 text-xs leading-relaxed text-muted-foreground">
                              <p className="font-medium text-foreground">{index === 0 ? 'Strongest finding' : `Additional finding ${index}`}: {finding.title}</p>
                              <p><span className="font-medium text-foreground">Discrepancy:</span> {finding.discrepancy}</p>
                              <p><span className="font-medium text-foreground">Reported Data:</span> {finding.reportedData}</p>
                              <p><span className="font-medium text-foreground">Factual Basis:</span> {finding.factualBasis}</p>
                              <p><span className="font-medium text-foreground">Dispute Reason:</span> {finding.disputeReason}</p>
                            </div>
                          )) : <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Strongest anomaly:</span> {item.strongestAnomaly}</p>}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Why ranked here:</span> {item.recommendationReason}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">Rankings are guidance, not guarantees. Bureau and furnisher investigations determine whether an item is corrected, verified, or removed.</p>
            {selectedItems.size > 0 && (
              <p className="text-xs text-primary font-medium">{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}

        {/* Step 4: Dispute Reason */}
        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Select Dispute Reason</h2>
            <p className="text-sm text-muted-foreground">Why are you disputing these items?</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {DISPUTE_REASONS.map(reason => (
                <button key={reason.value} type="button" onClick={() => setDisputeReason(reason.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${disputeReason === reason.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                  {disputeReason === reason.value ? <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground shrink-0 mt-0.5" />}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-foreground">{reason.value}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{reason.removalPotential} removal potential</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reason.why}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Rankings are guidance only. Outcomes depend on truthful facts, supporting evidence, and the bureau or furnisher investigation.</p>
            {disputeReason === 'Other (specify in notes)' && (
              <textarea className="input-field resize-none" rows={3} placeholder="Describe the dispute reason in detail…" value={customReason} onChange={e => setCustomReason(e.target.value)} />
            )}
            {disputeReason === 'Other (specify in notes)' && customReason.trim().length > 0 && customReason.trim().length < 10 && (
              <p className="error-text">Add at least 10 characters so the letter has a clear dispute reason.</p>
            )}
          </div>
        )}

        {/* Step 5: Instruction */}
        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Select Requested Instruction</h2>
            <p className="text-sm text-muted-foreground">What action do you want the bureau to take?</p>
            <div className="space-y-2">
              {INSTRUCTIONS.map(ins => (
                <button key={ins} type="button" onClick={() => setInstruction(ins)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${instruction === ins ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                  {instruction === ins ? <CheckCircle2 size={14} className="text-primary shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground shrink-0" />}
                  <p className="text-sm text-foreground">{ins}</p>
                </button>
              ))}
            </div>
            <div>
              <label className="label-text">Additional notes (optional)</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Any additional context for this dispute…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 6: Attach Docs */}
        {step === 6 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Attach Supporting Documents</h2>
            <p className="text-sm text-muted-foreground">List documents you will include with this dispute letter</p>
            <div className="space-y-2">
              {['Government-issued photo ID', 'Proof of current address', 'Social Security card (last 4 only)', 'Copy of credit report', 'Account statements', 'Payment receipts', 'Previous dispute letters and responses'].map(doc => {
                const checked = attachedDocs.includes(doc);
                return (
                  <button key={doc} type="button" onClick={() => setAttachedDocs(prev => checked ? prev.filter(d => d !== doc) : [...prev, doc])}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                    {checked ? <CheckCircle2 size={14} className="text-primary shrink-0" /> : <div className="w-3.5 h-3.5 rounded border-2 border-muted-foreground shrink-0" />}
                    <p className="text-sm text-foreground">{doc}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Document uploads are managed in the client&apos;s document storage. This step records which documents will be included with the letter.</p>
            </div>
          </div>
        )}

        {/* Step 7: Generate */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Review &amp; Generate Letter</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium text-foreground">{selectedClient?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Bureau</span>
                <span className="font-medium text-foreground">{selectedBureau}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Dispute Round</span>
                <span className="font-medium text-foreground">Round {round}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Items Selected</span>
                <span className="font-medium text-foreground">{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Dispute Reason</span>
                <span className="font-medium text-foreground text-right max-w-xs">{disputeReason}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Instruction</span>
                <span className="font-medium text-foreground text-right max-w-xs">{instruction}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium text-foreground">{attachedDocs.length} listed</span>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">Mailing Address</span>
                <span className="font-medium text-foreground text-right max-w-xs">
                  {hasCompleteMailingAddress(clientAddress, clientCity, clientState, clientZip)
                    ? `${clientAddress}, ${clientCity}, ${clientState.toUpperCase()} ${clientZip}`
                    : 'Required before generation'}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                <strong>No FixMy.Money approval is required.</strong> You remain responsible for reviewing the draft and confirming consumer authorization before use. A follow-up task will be created for 30 days from today.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(fromReport ? 2 : 1, s - 1))}
          disabled={step === (fromReport ? 2 : 1)}
          className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
        >
          <ChevronLeft size={15} /> Back
        </button>
        {step < 7 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
          >
            {nextLabels[step]} <ChevronRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2 min-w-[180px] justify-center"
          >
            {generating ? (
              <><Loader2 size={14} className="animate-spin" /> Generating…</>
            ) : (
              <><Send size={14} /> Generate Letter</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
