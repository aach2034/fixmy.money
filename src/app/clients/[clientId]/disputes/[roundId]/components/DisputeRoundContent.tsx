'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Send, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Printer, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { renderLetterForPrint } from '@/lib/disputes/letterPrint';

interface RoundItem {
  id: string;
  negativeItemId: string | null;
  bureau: string;
  creditorName: string;
  accountNumberMasked: string;
  accountType: string;
  negativeReason: string;
  disputeReason: string;
  disputeInstruction: string;
  status: string;
}

interface GeneratedLetter {
  id: string;
  bureau: string;
  letterContent: string;
  itemsCount: number;
  status: string;
  mailedAt: string | null;
  responseDueDate: string | null;
}

interface DisputeRound {
  id: string;
  roundNumber: number;
  title: string;
  status: string;
  itemsCount: number;
  bureaus: string[];
  lettersGenerated: number;
  createdAt: string;
}

interface DisputeRoundContentProps {
  clientId: string;
  roundId: string;
}

const BUREAU_COLORS: Record<string, string> = {
  Equifax: 'bureau-eq',
  Experian: 'bureau-ex',
  TransUnion: 'bureau-tu',
};

function generateLetterContent(
  bureau: string,
  clientName: string,
  items: RoundItem[],
  roundNumber: number
): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const bureauAddresses: Record<string, string> = {
    Equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
    Experian: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
    TransUnion: 'TransUnion LLC\nConsumer Dispute Center\nP.O. Box 2000\nChester, PA 19016',
  };

  const itemsList = items.map((item, i) => `
${i + 1}. Creditor/Furnisher: ${item.creditorName}
   Account Type: ${item.accountType}
   Negative Reason: ${item.negativeReason}
   Dispute Reason: ${item.disputeReason || 'Account information inaccurate'}
   Requested Action: ${item.disputeInstruction || 'Verify all information'}
   ${item.accountNumberMasked ? `Account Reference: ${item.accountNumberMasked}` : ''}
`).join('\n');

  return `${today}

${bureauAddresses[bureau] ?? bureau + ' Credit Bureau'}

Re: Formal Dispute of Inaccurate Credit Information — Round ${roundNumber}
Consumer: ${clientName}

To Whom It May Concern:

I am writing to formally dispute the following item(s) appearing on my credit report maintained by ${bureau}. Pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i, I request that you investigate and correct or remove the following inaccurate information:

DISPUTED ITEMS:
${itemsList}

Under the FCRA, you are required to:
1. Conduct a reasonable investigation of the disputed information within 30 days of receipt of this dispute.
2. Forward all relevant information to the furnisher of the disputed information.
3. Provide me with written results of the investigation.
4. Delete or correct any information that cannot be verified.

Please provide me with written confirmation of the results of your investigation. If you are unable to verify the accuracy of the disputed information, please delete it from my credit report immediately.

I am requesting that you:
- Investigate each item listed above
- Provide the method of verification used
- Send me an updated copy of my credit report reflecting any corrections

Sincerely,

${clientName}

Enclosures: [Attach supporting documentation as needed]`;
}

export default function DisputeRoundContent({ clientId, roundId }: DisputeRoundContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const [round, setRound] = useState<DisputeRound | null>(null);
  const [items, setItems] = useState<RoundItem[]>([]);
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<GeneratedLetter | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [certifiedMailingId, setCertifiedMailingId] = useState<string | null>(null);

  const loadRound = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase.from('staff_clients').select('name').eq('id', clientId).single();
      setClientName(clientData?.name ?? '');

      const { data: roundData } = await supabase.from('dispute_rounds').select('*').eq('id', roundId).single();
      if (roundData) {
        setRound({
          id: roundData.id,
          roundNumber: roundData.round_number,
          title: roundData.title,
          status: roundData.status,
          itemsCount: roundData.items_count,
          bureaus: roundData.bureaus ?? [],
          lettersGenerated: roundData.letters_generated ?? 0,
          createdAt: roundData.created_at,
        });
      }

      const { data: itemsData } = await supabase.from('dispute_round_items').select('*').eq('round_id', roundId);
      setItems((itemsData ?? []).map((row: any) => ({
        id: row.id,
        negativeItemId: row.negative_item_id ?? null,
        bureau: row.bureau,
        creditorName: row.creditor_name,
        accountNumberMasked: row.account_number_masked,
        accountType: row.account_type,
        negativeReason: row.negative_reason,
        disputeReason: row.dispute_reason,
        disputeInstruction: row.dispute_instruction,
        status: row.status,
      })));

      const { data: lettersData } = await supabase.from('generated_dispute_letters').select('*').eq('round_id', roundId);
      setLetters((lettersData ?? []).map((row: any) => ({
        id: row.id,
        bureau: row.bureau,
        letterContent: row.letter_content,
        itemsCount: row.items_count,
        status: row.status,
        mailedAt: row.mailed_at,
        responseDueDate: row.response_due_date,
      })));
    } catch (err: any) {
      toast.error('Failed to load dispute round');
    } finally {
      setLoading(false);
    }
  }, [roundId, clientId]);

  useEffect(() => { loadRound(); }, [loadRound]);

  const generateLetters = async () => {
    if (!round) return;
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Group items by bureau
      const bureauGroups: Record<string, RoundItem[]> = {};
      for (const item of items) {
        if (!bureauGroups[item.bureau]) bureauGroups[item.bureau] = [];
        bureauGroups[item.bureau].push(item);
      }

      const newLetters: GeneratedLetter[] = [];

      for (const [bureau, bureauItems] of Object.entries(bureauGroups)) {
        if (bureauItems.length === 0) continue;

        if (!clientName.trim()) throw new Error('Selected client profile is missing a consumer name.');
        const content = generateLetterContent(bureau, clientName, bureauItems, round.roundNumber);
        const responseDue = new Date();
        responseDue.setDate(responseDue.getDate() + 30);

        const { data: letter, error } = await supabase.from('generated_dispute_letters').insert({
          owner_id: user.id,
          client_id: clientId,
          round_id: roundId,
          bureau,
          letter_content: content,
          items_count: bureauItems.length,
          items_summary: bureauItems.map(i => ({ creditor: i.creditorName, reason: i.disputeReason })),
          status: 'generated',
          response_due_date: responseDue.toISOString().split('T')[0],
          days_remaining: 30,
        }).select().single();

        if (error) throw error;
        newLetters.push({
          id: letter.id,
          bureau,
          letterContent: content,
          itemsCount: bureauItems.length,
          status: 'generated',
          mailedAt: null,
          responseDueDate: responseDue.toISOString().split('T')[0],
        });
      }

      // Update round status and letter count
      await supabase.from('dispute_rounds').update({
        status: 'generated',
        letters_generated: newLetters.length,
        updated_at: new Date().toISOString(),
      }).eq('id', roundId);

      // Update round items status
      await supabase.from('dispute_round_items').update({ status: 'generated' }).eq('round_id', roundId);

      // Update negative items status
      const negItemIds = items.map(i => i.negativeItemId).filter((id): id is string => Boolean(id));
      if (negItemIds.length > 0) {
        await supabase.from('negative_items').update({ dispute_status: 'generated' }).in('id', negItemIds);
      }

      setLetters(newLetters);
      setRound(prev => prev ? { ...prev, status: 'generated', lettersGenerated: newLetters.length } : prev);
      toast.success(`${newLetters.length} dispute letter${newLetters.length !== 1 ? 's' : ''} generated`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate letters');
    } finally {
      setGenerating(false);
    }
  };

  const markAsMailed = async (letterId: string) => {
    setSavingStatus(letterId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const mailedAt = new Date().toISOString();
      const followUp = new Date();
      followUp.setDate(followUp.getDate() + 30);

      await supabase.from('generated_dispute_letters').update({ status: 'sent', mailed_at: mailedAt }).eq('id', letterId);
      await supabase.from('dispute_rounds').update({ status: 'sent', mailed_at: mailedAt, follow_up_date: followUp.toISOString() }).eq('id', roundId);

      setLetters(prev => prev.map(l => l.id === letterId ? { ...l, status: 'sent', mailedAt } : l));
      toast.success('Letter marked as mailed. Follow-up reminder set for 30 days.');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSavingStatus(null);
    }
  };

  const mailCertified = async (letter: GeneratedLetter) => {
    setCertifiedMailingId(letter.id);
    try {
      const quoteResponse = await fetch('/api/mailings/certified/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: letter.id, letterSource: 'generated_dispute_letters' }),
      });
      const quotePayload = await quoteResponse.json().catch(() => ({}));
      if (!quoteResponse.ok || !quotePayload?.quote?.available) {
        const setup = Array.isArray(quotePayload?.setupRequired ?? quotePayload?.quote?.setupRequired)
          ? (quotePayload.setupRequired ?? quotePayload.quote.setupRequired).join(', ')
          : '';
        toast.error(setup ? `USPS certified mail setup required: ${setup}` : quotePayload?.error ?? 'USPS certified mail is not available.');
        return;
      }

      const amount = typeof quotePayload.quote.amountCents === 'number'
        ? `$${(quotePayload.quote.amountCents / 100).toFixed(2)}`
        : 'the quoted USPS amount';
      if (!window.confirm(`Purchase USPS Certified Mail for ${letter.bureau}?\n\nCost: ${amount}`)) return;

      const purchaseResponse = await fetch('/api/mailings/certified/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: letter.id, letterSource: 'generated_dispute_letters' }),
      });
      const purchasePayload = await purchaseResponse.json().catch(() => ({}));
      if (!purchaseResponse.ok) throw new Error(purchasePayload?.error ?? 'Certified mailing could not be created.');

      const mailedAt = purchasePayload?.mailing?.mailed_at ?? new Date().toISOString();
      setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, status: 'sent', mailedAt } : l));
      setRound(prev => prev ? { ...prev, status: 'sent' } : prev);
      toast.success(`Certified mailing created${purchasePayload?.mailing?.tracking_number ? `: ${purchasePayload.mailing.tracking_number}` : ''}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not create certified mailing.');
    } finally {
      setCertifiedMailingId(null);
    }
  };

  const downloadLetter = (letter: GeneratedLetter) => {
    const blob = new Blob([letter.letterContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-letter-${letter.bureau}-round${round?.roundNumber ?? 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Letter downloaded`);
  };

  const printLetter = (letter: GeneratedLetter) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.opener = null;
    renderLetterForPrint(win.document, letter.letterContent, `Dispute Letter ${letter.bureau}`);
    win.print();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dispute round…</p>
        </div>
      </div>
    );
  }

  if (!round) return null;

  const bureauGroups: Record<string, RoundItem[]> = {};
  for (const item of items) {
    if (!bureauGroups[item.bureau]) bureauGroups[item.bureau] = [];
    bureauGroups[item.bureau].push(item);
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push(`/clients/${clientId}/negative-items`)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft size={13} /> Back to Negative Items
          </button>
          <h1 className="text-2xl font-semibold text-foreground">{round.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clientName} · {round.itemsCount} items · {round.bureaus.join(', ')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {letters.length === 0 ? (
            <button onClick={generateLetters} disabled={generating} className="btn-primary flex items-center gap-2">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Generate Letters
            </button>
          ) : (
            <button onClick={() => router.push(`/clients/${clientId}/letters`)} className="btn-secondary flex items-center gap-2">
              <FileText size={14} /> View All Letters
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="card p-4 flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${round.status === 'generated' || round.status === 'sent' ? 'bg-success' : round.status === 'draft' ? 'bg-muted-foreground' : 'bg-primary'}`} />
        <div>
          <p className="text-sm font-medium text-foreground capitalize">{round.status.replace('_', ' ')}</p>
          <p className="text-xs text-muted-foreground">Created {new Date(round.createdAt).toLocaleDateString()}</p>
        </div>
        {round.lettersGenerated > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-success text-sm">
            <CheckCircle2 size={15} />
            {round.lettersGenerated} letter{round.lettersGenerated !== 1 ? 's' : ''} generated
          </div>
        )}
      </div>

      {/* Compliance note - non-blocking */}
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>Review before sending — you are responsible for reviewing accuracy before mailing. Generated draft — confirm details before mailing.</span>
      </div>

      {/* Items by bureau */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Dispute Items by Bureau</h2>
        {Object.entries(bureauGroups).map(([bureau, bureauItems]) => (
          <div key={bureau} className="card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`badge ${BUREAU_COLORS[bureau] ?? 'bg-muted text-muted-foreground border-border'}`}>{bureau}</span>
                <span className="text-sm text-muted-foreground">{bureauItems.length} item{bureauItems.length !== 1 ? 's' : ''}</span>
              </div>
              {bureau === 'Unknown' && (
                <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">Bureau unknown — review manually</span>
              )}
            </div>
            <div className="divide-y divide-border">
              {bureauItems.map(item => (
                <div key={item.id} className="p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{item.creditorName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.accountType} {item.accountNumberMasked && `· ${item.accountNumberMasked}`}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 shrink-0">{item.negativeReason}</span>
                  </div>
                  {(item.disputeReason || item.disputeInstruction) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {item.disputeReason && <span>Reason: {item.disputeReason}</span>}
                      {item.disputeReason && item.disputeInstruction && <span className="mx-2">·</span>}
                      {item.disputeInstruction && <span>Action: {item.disputeInstruction}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Generated letters */}
      {letters.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Generated Letters</h2>
          {letters.map(letter => (
            <div key={letter.id} className="card">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`badge ${BUREAU_COLORS[letter.bureau] ?? 'bg-muted text-muted-foreground border-border'}`}>{letter.bureau}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{letter.itemsCount} item{letter.itemsCount !== 1 ? 's' : ''} disputed</p>
                    <p className="text-xs text-muted-foreground">
                      {letter.status === 'sent' ? `Mailed ${letter.mailedAt ? new Date(letter.mailedAt).toLocaleDateString() : ''}` : 'Ready to send'}
                      {letter.responseDueDate && ` · Response due ${new Date(letter.responseDueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${letter.status === 'sent' ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                    {letter.status === 'sent' ? 'Sent/Mailed' : 'Generated draft'}
                  </span>
                  <button onClick={() => setPreviewLetter(previewLetter?.id === letter.id ? null : letter)} className="btn-secondary text-xs flex items-center gap-1">
                    <FileText size={12} /> Preview
                  </button>
                  <button onClick={() => downloadLetter(letter)} className="btn-secondary text-xs flex items-center gap-1">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => printLetter(letter)} className="btn-secondary text-xs flex items-center gap-1">
                    <Printer size={12} /> Print
                  </button>
                  {letter.status !== 'sent' && (
                    <button onClick={() => mailCertified(letter)} disabled={certifiedMailingId === letter.id} className="btn-secondary text-xs flex items-center gap-1">
                      {certifiedMailingId === letter.id ? <Loader2 size={12} className="animate-spin" /> : <MailCheck size={12} />}
                      Mail Certified
                    </button>
                  )}
                  {letter.status !== 'sent' && (
                    <button onClick={() => markAsMailed(letter.id)} disabled={savingStatus === letter.id} className="btn-primary text-xs flex items-center gap-1">
                      {savingStatus === letter.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Mark Mailed
                    </button>
                  )}
                </div>
              </div>

              {previewLetter?.id === letter.id && (
                <div className="border-t border-border p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap bg-muted/30 rounded-xl p-4 max-h-96 overflow-y-auto">
                    {letter.letterContent}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
