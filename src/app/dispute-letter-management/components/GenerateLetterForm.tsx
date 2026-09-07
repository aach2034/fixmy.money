'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckSquare, Square, Loader2, Download, Printer, X, AlertTriangle, FileText, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deduplicateDisputeRows, getDisputeItemDates } from '@/lib/creditReport/disputeItems';
import { scoreDisputeStrength } from '@/lib/creditReport/auditItems';
import { buildConsumerSenderBlock, formatMissingMailingAddressError, getLetterSenderInfo, normalizeClientMailingAddress, toCanonicalMailingAddressUpdate, type LetterSenderInfo } from '@/lib/disputes/letterSender';
import { formatAnomalyFindingsForLetter, prepareAnomalyFindings, type AnomalyFindingView } from '@/lib/disputes/anomalyFindings';
import { deduplicateSupportingDocuments, formatAccountType } from '@/lib/disputes/letterPresentation';
import { renderLetterForPrint } from '@/lib/disputes/letterPrint';

interface GenerateLetterFormData {
  clientId: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  bureau: string;
  template: string;
  round: string;
  notes: string;
}

interface ClientOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface DisputeItem {
  id: string;
  label: string;
  type: string;
  amount: string;
  bureau: string;
  disputeReason: string;
  template: string;
  creditorName: string;
  accountNumber: string;
  reportingStatus?: string;
  strongestAnomaly?: string;
  reportedDataSummary?: string;
  disputeBasis?: string;
  isRecommended?: boolean;
  findings?: AnomalyFindingView[];
  dateOpened: string;
  dateReported: string;
  dateLastActivity: string;
  source: 'negative_items' | 'client_disputes';
}

const accountDateSummary = (item: Pick<DisputeItem, 'dateOpened' | 'dateReported' | 'dateLastActivity'>) => [
  item.dateOpened && `Opened: ${item.dateOpened}`,
  item.dateReported && `Reported: ${item.dateReported}`,
  item.dateLastActivity && `Last activity: ${item.dateLastActivity}`,
].filter(Boolean).join(' | ');

interface ValidationIssue {
  field: string;
  message: string;
}

const templates = [
  { id: 'FCRA Section 611', name: 'FCRA Section 611 — Standard Dispute', desc: 'Requests investigation of inaccurate items under 15 U.S.C. § 1681i' },
  { id: 'Method of Verification', name: 'Method of Verification', desc: 'Demands proof of verification method used by bureau under 15 U.S.C. § 1681i(a)(6)' },
  { id: 'Reinvestigation', name: 'Reinvestigation Letter', desc: 'Second-round reinvestigation demand after inadequate initial response' },
  { id: 'Goodwill Deletion', name: 'Goodwill Deletion', desc: 'Requests removal of accurate but paid/resolved items as a goodwill gesture' },
  { id: 'Debt Validation', name: 'Debt Validation (FDCPA)', desc: 'Requests original creditor documentation from collector under 15 U.S.C. § 1692g' },
  { id: 'Creditor Direct Dispute', name: 'Creditor Direct Dispute', desc: 'Disputes item directly with the furnishing creditor under 15 U.S.C. § 1681s-2(b)' },
  { id: 'Collector Dispute', name: 'Collector Dispute', desc: 'Disputes collection account with the debt collector' },
  { id: 'Inquiry Dispute', name: 'Inquiry Dispute', desc: 'Disputes unauthorized hard inquiries on credit report' },
  { id: 'Personal Information Dispute', name: 'Personal Information Dispute', desc: 'Corrects inaccurate personal information (name, address, SSN, DOB)' },
  { id: 'Bankruptcy Public Record', name: 'Bankruptcy / Public Record Dispute', desc: 'Disputes inaccurate bankruptcy or public record entries' },
  { id: 'Pay for Delete', name: 'Pay-for-Delete Negotiation', desc: 'Offers payment in exchange for deletion of collection account' },
  { id: 'Cease and Desist', name: 'Cease and Desist', desc: 'Demands collector stop all communication under 15 U.S.C. § 1692c(c)' },
  { id: 'Warning Escalation', name: 'Warning / Escalation Letter', desc: 'Final warning before legal action citing FCRA/FDCPA violations' },
  { id: 'HIPAA Medical', name: 'HIPAA Medical Dispute', desc: 'Disputes medical collections citing HIPAA privacy violations' },
];

const templateGuidance: Record<string, { when: string; practice: string }> = {
  'FCRA Section 611': {
    when: 'Typically the best starting point when a credit bureau is reporting specific information that the consumer believes is inaccurate or incomplete.',
    practice: 'The strongest disputes are usually narrow, factual, and supported by documents. Identify the exact field that is wrong instead of making a broad deletion request.',
  },
  'Method of Verification': {
    when: 'Typically used after a bureau says an item was verified and the consumer needs details about how the investigation was performed.',
    practice: 'Most useful when it references the prior dispute, the bureau response, and the exact item that remained unresolved.',
  },
  Reinvestigation: {
    when: 'Typically appropriate after an initial dispute produced an incomplete response or failed to address the evidence submitted.',
    practice: 'Better-supported cases explain what the first investigation missed and include the prior letter, response, and any new documentation.',
  },
  'Debt Validation': {
    when: 'Typically sent to a third-party debt collector, especially soon after receiving a collection notice. It is not a substitute for a bureau dispute.',
    practice: 'Success is more likely when the request identifies the collector and account clearly and is sent within any deadline stated in the collection notice.',
  },
  'Creditor Direct Dispute': {
    when: 'Typically used when the company furnishing data to the bureaus has specific inaccurate account information.',
    practice: 'Clear account identifiers and documents showing the correct balance, dates, or payment history make the request easier to investigate.',
  },
  'Goodwill Deletion': {
    when: 'Typically reserved for accurate negative information after the account has been resolved; removal is discretionary.',
    practice: 'There is no guaranteed outcome. Concise requests that acknowledge the history and explain unusual circumstances are generally more credible.',
  },
  'Warning Escalation': {
    when: 'Usually not a first letter. Consider it only after documented attempts to correct a specific unresolved error.',
    practice: 'Avoid threats or claims that cannot be supported. A factual timeline and copies of earlier correspondence are more persuasive.',
  },
};

const itemTypeLabels: Record<string, string> = {
  collection: 'Collection Account',
  charge_off: 'Charge-Off',
  late_payment: 'Late Payment',
  repossession: 'Repossession',
  bankruptcy: 'Bankruptcy',
  hard_inquiry: 'Hard Inquiry',
  other: 'Derogatory Item',
};

const bureauAddresses: Record<string, { name: string; address: string }> = {
  Equifax: {
    name: 'Equifax Information Services LLC',
    address: 'P.O. Box 740256\nAtlanta, GA 30374-0256',
  },
  Experian: {
    name: 'Experian',
    address: 'P.O. Box 4500\nAllen, TX 75013',
  },
  TransUnion: {
    name: 'TransUnion LLC Consumer Dispute Center',
    address: 'P.O. Box 2000\nChester, PA 19016',
  },
};

const legalLanguageByTemplate: Record<string, string> = {
  'FCRA Section 611': `Pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i, I am formally requesting that you investigate the item(s) listed below within the applicable period required by the FCRA and correct or delete information that is unverifiable or otherwise required to be corrected or removed.`,
  'Method of Verification': `Pursuant to 15 U.S.C. § 1681i(a)(6) of the Fair Credit Reporting Act, I am requesting that you provide me with the method of verification used to confirm the accuracy of the disputed item(s). You are required to provide this information upon request. Please provide the name, address, and telephone number of the person or entity that verified the information, as well as the date of verification.`,
  'Reinvestigation': `This letter serves as a formal request for reinvestigation under 15 U.S.C. § 1681i of the Fair Credit Reporting Act. My previous dispute was not properly investigated, and the inaccurate information remains on my credit report. I am again demanding a thorough investigation. Failure to conduct a proper reinvestigation and correct or delete unverifiable information may constitute a willful violation of the FCRA, subjecting your organization to civil liability under 15 U.S.C. § 1681n.`,
  'Goodwill Deletion': `I am writing to respectfully request a goodwill deletion of the item(s) listed below. This account has been paid/resolved, and I am requesting that you consider removing this entry from my credit report as a gesture of goodwill. I understand you are not legally obligated to do so, but I respectfully ask that you consider my request given my otherwise positive payment history and my commitment to financial responsibility.`,
  'Debt Validation': `Pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g, I am formally requesting validation of the debt referenced below. You are required to cease all collection activity until you provide adequate validation. Please provide: (1) the amount of the debt; (2) the name of the original creditor; (3) a copy of the original signed agreement; (4) proof that your agency is licensed to collect in my state; and (5) proof that the statute of limitations has not expired.`,
  'Creditor Direct Dispute': `Pursuant to 15 U.S.C. § 1681s-2(b) of the Fair Credit Reporting Act, I am disputing the accuracy of information you have furnished to the credit reporting agencies. As a furnisher of information, you have a legal obligation to investigate this dispute and correct or delete any inaccurate information. Failure to do so may constitute a violation of the FCRA, subjecting you to civil liability.`,
  'Collector Dispute': `Pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692, and the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681, I am formally disputing the collection account referenced below. I request that you investigate this matter and remove any inaccurate, unverifiable, or improperly reported information from my credit file.`,
  'Inquiry Dispute': `Pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681b, a consumer reporting agency may only furnish a consumer report for permissible purposes. I did not authorize the inquiry referenced below, and I am requesting that it be immediately removed from my credit report. Unauthorized inquiries are a violation of the FCRA and may constitute identity theft.`,
  'Personal Information Dispute': `Pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681e(b), consumer reporting agencies must follow reasonable procedures to ensure maximum possible accuracy of consumer reports. The personal information listed below is inaccurate and must be corrected immediately. Please update your records to reflect the accurate information provided in this letter.`,
  'Bankruptcy Public Record': `Pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681c, I am disputing the accuracy of the public record item listed below. Public records must be reported with complete accuracy, including correct dates, amounts, and status. I request that you investigate this item and correct or delete any inaccurate information.`,
  'Pay for Delete': `I am writing to propose a pay-for-delete arrangement regarding the collection account referenced below. I am prepared to pay the balance in full (or negotiate a settlement) in exchange for the complete deletion of this account from all three major credit bureaus. This offer is contingent upon your written agreement to delete the account upon receipt of payment. Please respond in writing within 30 days.`,
  'Cease and Desist': `Pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692c(c), I am formally demanding that you immediately cease all communication with me regarding the debt referenced below. This includes but is not limited to phone calls, letters, emails, and any other form of communication. Any further contact may constitute a violation of the FDCPA, subjecting your organization to civil liability.`,
  'Warning Escalation': `This letter serves as a final warning before I pursue all available legal remedies. Your failure to properly investigate and correct the disputed item(s) may constitute willful noncompliance with the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681n, and/or the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692. I am prepared to file complaints with the Consumer Financial Protection Bureau (CFPB), the Federal Trade Commission (FTC), and my state attorney general, and to pursue civil litigation if necessary.`,
  'HIPAA Medical': `Pursuant to the Health Insurance Portability and Accountability Act (HIPAA), 45 C.F.R. § 164.502, and the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681, I am disputing the medical collection account referenced below. The reporting of this medical debt may constitute a violation of HIPAA privacy regulations, as I have not provided written authorization for the disclosure of my protected health information to credit reporting agencies. I request immediate deletion of this account.`,
};

const instructionByTemplate: Record<string, string> = {
  'FCRA Section 611': 'Please investigate the disputed item(s) within the applicable period required by the FCRA. If the information is unverifiable or otherwise required to be corrected or removed, please correct or delete it as applicable. Please send written confirmation of your investigation results to the address above.',
  'Method of Verification': 'Please provide the complete method of verification within 15 days. Include the name, address, and contact information of the verifying party, the date of verification, and all documentation used. If you cannot provide this information, delete the disputed item immediately.',
  'Reinvestigation': 'Please conduct a thorough reinvestigation of the disputed item(s) within 30 days. Do not simply re-verify with the original furnisher — conduct an independent investigation. Provide written results of your investigation to the address above.',
  'Goodwill Deletion': 'Please review my request and notify me of your decision in writing within 30 days. If you agree to delete the item, please confirm the deletion in writing and update all credit reporting agencies accordingly.',
  'Debt Validation': 'Please provide complete debt validation within 30 days. Cease all collection activity, including credit reporting, until validation is provided. If you cannot validate the debt, delete the account from my credit report and cease all collection efforts.',
  'Creditor Direct Dispute': 'Please investigate this dispute within 30 days and correct or delete any inaccurate information. Notify all credit reporting agencies to which you have furnished this information of any corrections. Provide written confirmation of your investigation results.',
  'Collector Dispute': 'Please investigate this dispute and remove any inaccurate information from my credit report within 30 days. Provide written confirmation of your investigation and any corrections made.',
  'Inquiry Dispute': 'Please remove the unauthorized inquiry from my credit report immediately. Provide written confirmation of the removal within 15 days.',
  'Personal Information Dispute': 'Please update my personal information as specified above and remove any inaccurate information from my credit file. Provide written confirmation of the corrections within 30 days.',
  'Bankruptcy Public Record': 'Please investigate the public record item and correct or delete any inaccurate information within 30 days. Provide written confirmation of your investigation results.',
  'Pay for Delete': 'Please respond to this offer in writing within 30 days. Upon receipt of your written agreement, I will arrange payment promptly. Do not contact me by phone — all communication must be in writing.',
  'Cease and Desist': 'Acknowledge receipt of this cease and desist notice in writing within 5 business days. Any further contact will be considered a violation of the FDCPA and will be reported to the appropriate regulatory authorities.',
  'Warning Escalation': 'You have 15 days to respond to this letter with evidence of proper investigation and correction of the disputed item(s). Failure to respond will result in formal complaints and legal action without further notice.',
  'HIPAA Medical': 'Please delete the medical collection account from my credit report immediately and provide written confirmation within 30 days. If you believe you have authorization to report this information, provide a copy of my signed written authorization.',
};

// ─── Fallback Letter Builder (no AI required) ────────────────────────────────
export function buildFallbackLetter(params: {
  sender: LetterSenderInfo;
  bureau: string;
  template: string;
  round: number;
  items: DisputeItem[];
  notes: string;
  letterId: string;
}): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const bureauInfo = bureauAddresses[params.bureau] ?? { name: params.bureau, address: '' };
  const legalText = legalLanguageByTemplate[params.template] ?? legalLanguageByTemplate['FCRA Section 611'];
  const instructionText = instructionByTemplate[params.template] ?? instructionByTemplate['FCRA Section 611'];
  const senderBlock = buildConsumerSenderBlock(params.sender);

  const roundNote = params.round > 1
    ? `\nNOTE: This is Round ${params.round} of my dispute. My previous dispute(s) were not properly investigated or resolved. I am again demanding a thorough investigation.\n`
    : '';

  const itemsSection = params.items.map((item, i) => {
    const acctDisplay = item.accountNumber
      ? `Account Number: ****${item.accountNumber.slice(-4)}`
      : 'Account Number: On File';
    const statusLine = item.reportingStatus
      ? `\n   Reporting Status: ${item.reportingStatus}`
      : '';
    const dates = accountDateSummary(item);
    const dateLine = dates ? `\n   Report Dates: ${dates}` : '';
    const discrepancyLine = item.strongestAnomaly ? `\n   Discrepancy: ${item.strongestAnomaly}` : '';
    const reportedDataLine = item.reportedDataSummary ? `\n   Reported Data: ${item.reportedDataSummary}` : '';
    const factualBasis = item.reportedDataSummary && item.disputeBasis
      ? item.disputeBasis
      : item.disputeReason || 'This item is inaccurate, incomplete, or unverifiable and must be investigated.';
    const findings = formatAnomalyFindingsForLetter(item.findings ?? []);
    return `Item ${i + 1}:
   Creditor / Furnisher: ${item.creditorName}
   ${acctDisplay}
   Item Type: ${formatAccountType(item.type)}
   Amount Reported: ${item.amount}
${findings || `   Dispute Reason: ${item.disputeReason || 'Inaccurate, incomplete, or unverifiable'}${discrepancyLine}${reportedDataLine}
   Factual Basis: ${factualBasis}`}${statusLine}${dateLine}

   Requested Action: ${instructionText}`;
  }).join('\n\n');

  const documents = deduplicateSupportingDocuments([
    'Copy of government-issued photo ID',
    'Copy of proof of current address (utility bill or bank statement)',
    'Copy of Social Security card (last 4 digits visible only)',
    ...(params.items.some(i => i.type.toLowerCase().includes('medical')) ? ['HIPAA authorization revocation notice'] : []),
    ...(params.round > 1 ? ['Copy of previous dispute letter and bureau response'] : []),
    'Any additional documentation relevant to the disputed item(s)',
  ]);
  const docsSection = `SUPPORTING DOCUMENTS ENCLOSED:\n${documents.map(document => `• ${document}`).join('\n')}`;

  const notesSection = params.notes
    ? `\nADDITIONAL INFORMATION:\n${params.notes}\n`
    : '';

  return `${senderBlock}

${today}

${bureauInfo.name}
${bureauInfo.address}

Re: Formal Credit Dispute — ${params.template}
    Letter Reference: ${params.letterId}
    Dispute Round: ${params.round}

To Whom It May Concern:

I am writing to formally dispute the following item(s) on my credit report. I am exercising my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., and any other applicable federal and state consumer protection laws.
${roundNote}
${legalText}

DISPUTED ITEM(S):

${itemsSection}
${notesSection}
${docsSection}

I am aware of my rights under the FCRA and FDCPA. I expect a prompt, thorough, and legally compliant response. Please send all correspondence to the address listed above.

Sincerely,


_________________________________
${params.sender.name}
Date: ${today}`;
}

// ─── Letter Preview Modal ────────────────────────────────────────────────────
interface LetterPreviewProps {
  letterContent: string;
  letterId: string;
  clientName: string;
  bureau: string;
  onClose: () => void;
}

function LetterPreviewModal({ letterContent, letterId, clientName, bureau, onClose }: LetterPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    printWindow.opener = null;
    renderLetterForPrint(printWindow.document, letterContent, `Dispute Letter ${letterId}`);
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to download.');
      return;
    }
    printWindow.opener = null;
    renderLetterForPrint(printWindow.document, letterContent, `Dispute Letter ${letterId}`);
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    toast.success('Use "Save as PDF" in the print dialog to download');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([letterContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-letter-${letterId}-${clientName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Letter downloaded as text file');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Dispute Letter — {letterId}</h2>
              <p className="text-xs text-muted-foreground">{clientName} · {bureau} · Ready to use</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Letter content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef} className="bg-white rounded-xl border border-border p-8 shadow-sm">
            <pre className="whitespace-pre-wrap font-serif text-sm text-gray-900 leading-relaxed">{letterContent}</pre>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-muted/30">
          <div>
            <p className="text-xs font-semibold text-success bg-success/5 border border-success/20 rounded-lg px-3 py-1.5">
              Editable software-generated draft — no FixMy.Money approval required
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTxt}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Download size={14} /> Download .txt
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <FileText size={14} /> Save as PDF
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Validation Error Panel ──────────────────────────────────────────────────
function ValidationErrorPanel({ issues, onClose }: { issues: ValidationIssue[]; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/30 rounded-xl">
      <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-danger">Cannot generate letter — required fields missing</p>
        <p className="text-xs text-danger/80 mt-1 mb-2">Please fill in the following fields before generating:</p>
        <ul className="space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className="text-xs text-danger/90 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              <span><strong>{issue.field}:</strong> {issue.message}</span>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={onClose} className="p-1 hover:bg-danger/20 rounded transition-colors">
        <X size={12} className="text-danger" />
      </button>
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────
export default function GenerateLetterForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [clientsLoading, setClientsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [disputeItems, setDisputeItems] = useState<DisputeItem[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [aiUsed, setAiUsed] = useState<boolean | null>(null);
  const [previewLetter, setPreviewLetter] = useState<{
    content: string;
    letterId: string;
    clientName: string;
    bureau: string;
  } | null>(null);

  const supabase = createClient();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<GenerateLetterFormData>({
    defaultValues: { bureau: 'Equifax', template: 'FCRA Section 611', round: '1' },
  });

  const selectedClient = watch('clientId');
  const selectedBureau = watch('bureau');

  // Load real clients
  useEffect(() => {
    const fetchClients = async () => {
      setClientsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to generate letters');
          return;
        }
        const { data, error } = await supabase
          .from('staff_clients')
          .select('id, name, email, phone, address, city, state, zip')

          .order('name', { ascending: true });
        if (error) {
          toast.error(`Failed to load clients: ${error.message}`);
          return;
        }
        setClientOptions((data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          city: c.city,
          state: c.state,
          zip: c.zip,
        })));
      } catch (err: any) {
        toast.error(`Error loading clients: ${err?.message ?? 'Unknown error'}`);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Auto-fill address when client is selected
  useEffect(() => {
    if (!selectedClient) return;
    const client = clientOptions.find(c => c.id === selectedClient);
    if (client) {
      if (client.address) setValue('clientAddress', client.address);
      if (client.city) setValue('clientCity', client.city);
      if (client.state) setValue('clientState', client.state);
      if (client.zip) setValue('clientZip', client.zip);
    }
  }, [selectedClient, clientOptions, setValue]);

  // Load disputes for selected client + bureau
  useEffect(() => {
    if (!selectedClient) {
      setDisputeItems([]);
      setSelectedItems(new Set());
      return;
    }
    const fetchDisputes = async () => {
      setItemsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: negativeRows, error: negativeError } = await supabase
          .from('negative_items')
          .select('*')

          .eq('client_id', selectedClient);
        if (negativeError) throw negativeError;

        const selectedBureauKey = String(selectedBureau ?? '').trim().toLowerCase();
        const belongsToSelectedBureau = (item: any) => {
          const bureaus = [item.bureau, ...(Array.isArray(item.bureaus_reporting) ? item.bureaus_reporting : [])]
            .filter(Boolean)
            .map((bureau: unknown) => String(bureau).trim().toLowerCase());
          return !selectedBureauKey || selectedBureauKey === 'all' || bureaus.includes(selectedBureauKey);
        };
        const availableNegativeRows = (negativeRows ?? []).filter((item: any) => {
          const status = String(item.dispute_status ?? 'draft').toLowerCase();
          if (status === 'resolved') return false;

          const category = String(item.negative_category ?? '').toLowerCase();
          const isNegative = item.is_negative === true ||
            category === 'hard_inquiry' ||
            (category !== 'positive' && Boolean(item.negative_reason));
          if (!isNegative) return false;

          return true;
        });

        let items: DisputeItem[] = deduplicateDisputeRows(scoreDisputeStrength(availableNegativeRows).filter(belongsToSelectedBureau)).map((d: any) => ({
          id: d.id,
          label: `${d.creditor_name ?? 'Unknown'} — ${itemTypeLabels[d.negative_category] ?? d.negative_category ?? 'Item'}`,
          type: itemTypeLabels[d.negative_category] ?? d.negative_category ?? 'Derogatory Item',
          amount: d.balance ? `$${Number(d.balance).toLocaleString()}` : '—',
          bureau: d.bureau ?? selectedBureau ?? '',
          disputeReason: d.negative_reason ?? '',
          template: 'FCRA Section 611',
          creditorName: d.creditor_name ?? 'Unknown Creditor',
          accountNumber: d.account_number_masked ?? '',
          reportingStatus: d.status ?? d.account_status ?? '',
          strongestAnomaly: d.disputeStrength.strongestAnomaly,
          reportedDataSummary: d.disputeStrength.reportedDataSummary,
          disputeBasis: d.disputeStrength.disputeBasis,
          isRecommended: d.disputeStrength.isRecommended,
          findings: prepareAnomalyFindings(d.disputeStrength.findings),
          ...getDisputeItemDates(d),
          source: 'negative_items',
        }));

        // Keep compatibility with manually created and older dispute queues.
        if (items.length === 0) {
          let legacyQuery = supabase
            .from('client_disputes')
            .select('*')

            .eq('staff_client_id', selectedClient)
            .not('dispute_status', 'eq', 'resolved');
          if (selectedBureau && selectedBureau !== 'All') legacyQuery = legacyQuery.eq('bureau', selectedBureau);
          const { data: legacyRows, error: legacyError } = await legacyQuery.order('priority', { ascending: true });
          if (legacyError) throw legacyError;
          items = (legacyRows ?? []).map((d: any) => ({
            id: d.id,
            label: `${d.creditor_name ?? 'Unknown'} — ${itemTypeLabels[d.negative_item_type] ?? d.negative_item_type}`,
            type: itemTypeLabels[d.negative_item_type] ?? d.negative_item_type,
            amount: d.amount ? `$${Number(d.amount).toLocaleString()}` : '—',
            bureau: d.bureau ?? '',
            disputeReason: d.dispute_reason ?? '',
            template: d.dispute_letter_template ?? 'FCRA Section 611',
            creditorName: d.creditor_name ?? 'Unknown Creditor',
            accountNumber: d.account_number ?? '',
          reportingStatus: d.reporting_status ?? '',
          ...getDisputeItemDates(d),
          source: 'client_disputes',
          }));
        }
        setDisputeItems(items);
        setSelectedItems(new Set());
        if (items.length > 0) {
          setValue('template', items[0].template);
        }
      } catch (err: any) {
        toast.error(`Error loading disputes: ${err?.message ?? 'Unknown error'}`);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchDisputes();
  }, [selectedClient, selectedBureau]);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Validate required fields before generation ──────────────────────────
  const validateBeforeGenerate = (data: GenerateLetterFormData): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!data.clientId) issues.push({ field: 'Client', message: 'Select a client from the dropdown' });
    if (selectedItems.size === 0) issues.push({ field: 'Dispute Items', message: 'Select at least one dispute item to include' });
    return issues;
  };

  const onSubmit = async (data: GenerateLetterFormData) => {
    setGenerationError(null);
    setValidationIssues([]);

    // ─── Pre-generation validation ───────────────────────────────────────
    const issues = validateBeforeGenerate(data);
    if (issues.length > 0) {
      setValidationIssues(issues);
      return;
    }

    setLoading(true);
    setLoadingStep('Authenticating…');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error(`Authentication failed: ${authError?.message ?? 'No user session found'}`);
      }

      setLoadingStep('Loading workspace…');
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')

        .single();

      const selectedDisputeItems = disputeItems.filter(item => selectedItems.has(item.id));
      const selectedClientOption = clientOptions.find(client => client.id === data.clientId);
      const addressInput = { name: selectedClientOption?.name, address: data.clientAddress, city: data.clientCity, state: data.clientState, zip: data.clientZip };
      const addressUpdate = toCanonicalMailingAddressUpdate(addressInput);
      if (!addressUpdate) throw new Error(formatMissingMailingAddressError(addressInput) ?? 'Client name is missing.');
      const { error: addressUpdateError } = await supabase
        .from('staff_clients')
        .update(addressUpdate)
        .eq('id', data.clientId)
        ;
      if (addressUpdateError) throw new Error('Client mailing address could not be saved.');

      const { data: clientInfo, error: clientError } = await supabase
        .from('staff_clients')
        .select('id, name, email, phone, address, city, state, zip')
        .eq('id', data.clientId)

        .single();
      if (clientError || !clientInfo) throw new Error('Selected client profile could not be refreshed.');

      const sender = getLetterSenderInfo(clientInfo);
      if (!sender) throw new Error(formatMissingMailingAddressError(clientInfo) ?? 'Client name is missing.');
      const normalizedAddress = normalizeClientMailingAddress(clientInfo);
      setClientOptions(current => current.map(client => client.id === data.clientId ? clientInfo : client));
      setValue('clientAddress', normalizedAddress.street);
      setValue('clientCity', normalizedAddress.city);
      setValue('clientState', normalizedAddress.state);
      setValue('clientZip', normalizedAddress.postalCode);
      const clientName = sender.name;

      const bureauShort: Record<string, string> = { Equifax: 'EQ', Experian: 'EX', TransUnion: 'TU' };
      const shortCode = bureauShort[data.bureau] ?? data.bureau.substring(0, 2).toUpperCase();
      const letterNum = Math.floor(Math.random() * 9000) + 1000;
      const letterId = `${shortCode}-${letterNum}`;

      // Generate locally from the complete legal template. This deliberately
      // avoids an OpenAI request so letter creation does not consume credits.
      setLoadingStep('Building dispute letter…');
      const letterContent = buildFallbackLetter({
        sender,
        bureau: data.bureau,
        template: data.template,
        round: parseInt(data.round, 10),
        items: selectedDisputeItems,
        notes: data.notes ?? '',
        letterId,
      });
      const usedAI = false;

      // ─── Final safety check: never save a blank letter ───────────────────
      if (!letterContent || letterContent.trim().length < 100) {
        throw new Error('Letter generation produced no content. Please check your dispute items and try again.');
      }

      setAiUsed(usedAI);
      setLoadingStep('Saving letter to database…');

      const responseDueDate = new Date();
      responseDueDate.setDate(responseDueDate.getDate() + 30);

      const { error: insertError } = await supabase.from('dispute_letters').insert({
        owner_id: user.id,
        client_id: data.clientId,
        workspace_id: workspace?.id ?? null,
        letter_id: letterId,
        client_name: clientName,
        bureau: data.bureau,
        items_count: selectedItems.size,
        round: parseInt(data.round, 10),
        sent_date: null,
        response_due_date: null,
        days_remaining: 0,
        letter_status: 'draft',
        template: data.template,
        auto_generated: false,
        letter_content: letterContent,
        generated_at: new Date().toISOString(),
        generation_error: null,
      });

      if (insertError) {
        throw new Error(`Failed to save letter: ${insertError.message}`);
      }

      // Mark only the source rows selected for this letter.
      const selectedDisputeRows = disputeItems.filter(item => selectedItems.has(item.id));
      const legacyIds = selectedDisputeRows.filter(item => item.source === 'client_disputes').map(item => item.id);
      const negativeIds = selectedDisputeRows.filter(item => item.source === 'negative_items').map(item => item.id);
      if (legacyIds.length > 0) {
        const { error: legacyStatusError } = await supabase
          .from('client_disputes')
          .update({ dispute_status: 'in_progress' })
          .in('id', legacyIds);
        if (legacyStatusError) throw legacyStatusError;
      }
      if (negativeIds.length > 0) {
        const { error: negativeStatusError } = await supabase
          .from('negative_items')
          .update({ dispute_status: 'generated' })
          .in('id', negativeIds);
        if (negativeStatusError) throw negativeStatusError;
      }

      toast.success(`Dispute letter ${letterId} generated${usedAI ? ' with AI assistance' : ' from template'}`);

      setPreviewLetter({
        content: letterContent,
        letterId,
        clientName,
        bureau: data.bureau,
      });

    } catch (err: any) {
      const errorMsg = err?.message ?? 'Failed to generate letter. Please try again.';
      console.error('[GenerateLetterForm] Generation failed:', err);
      setGenerationError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  if (previewLetter) {
    return (
      <LetterPreviewModal
        letterContent={previewLetter.content}
        letterId={previewLetter.letterId}
        clientName={previewLetter.clientName}
        bureau={previewLetter.bureau}
        onClose={onClose}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Validation errors */}
      {validationIssues.length > 0 && (
        <ValidationErrorPanel issues={validationIssues} onClose={() => setValidationIssues([])} />
      )}

      {/* Generation error */}
      {generationError && (
        <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/30 rounded-xl">
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger">Generation Failed</p>
            <p className="text-xs text-danger/80 mt-0.5 break-words">{generationError}</p>
          </div>
          <button type="button" onClick={() => setGenerationError(null)} className="p-1 hover:bg-danger/20 rounded transition-colors">
            <X size={12} className="text-danger" />
          </button>
        </div>
      )}

      {/* AI notice */}
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Info size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground">
          <strong>No FixMy.Money approval is required.</strong> Your business must review each draft, verify the facts and authorization, and decide whether to use or send it.
        </p>
      </div>

      {/* Client + Bureau */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Client <span className="text-danger">*</span></label>
          {clientsLoading ? (
            <div className="input-field flex items-center gap-2 text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading clients…
            </div>
          ) : (
            <select className="input-field" {...register('clientId', { required: 'Select a client' })}>
              <option value="">— Select client —</option>
              {clientOptions.map(c => <option key={`cl-opt-${c.id}`} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {errors.clientId && <p className="error-text">{errors.clientId.message}</p>}
        </div>
        <div>
          <label className="label-text">Target bureau <span className="text-danger">*</span></label>
          <select className="input-field" {...register('bureau', { required: true })}>
            <option value="Equifax">Equifax</option>
            <option value="Experian">Experian</option>
            <option value="TransUnion">TransUnion</option>
          </select>
        </div>
      </div>

      {/* Client address */}
      <div className="space-y-3">
        <div>
          <label className="label-text">Client street address <span className="text-danger">*</span></label>
          <p className="helper-text">Required for the letter header — appears on the printed letter</p>
          <input
            className="input-field"
            placeholder="123 Main Street, Apt 4B"
            {...register('clientAddress', { required: 'Street address is required' })}
          />
          {errors.clientAddress && <p className="error-text">{errors.clientAddress.message}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-text">City <span className="text-danger">*</span></label>
            <input
              className="input-field"
              placeholder="Atlanta"
              {...register('clientCity', { required: 'City is required' })}
            />
            {errors.clientCity && <p className="error-text">{errors.clientCity.message}</p>}
          </div>
          <div>
            <label className="label-text">State <span className="text-danger">*</span></label>
            <input
              className="input-field"
              placeholder="GA"
              maxLength={2}
              {...register('clientState', { required: 'State is required' })}
            />
            {errors.clientState && <p className="error-text">{errors.clientState.message}</p>}
          </div>
          <div>
            <label className="label-text">ZIP <span className="text-danger">*</span></label>
            <input
              className="input-field"
              placeholder="30301"
              {...register('clientZip', { required: 'ZIP code is required' })}
            />
            {errors.clientZip && <p className="error-text">{errors.clientZip.message}</p>}
          </div>
        </div>
      </div>

      {/* Template */}
      <div>
        <label className="label-text">Letter template <span className="text-danger">*</span></label>
        <p className="helper-text">Choose the legal basis for this dispute</p>
        {templateGuidance[watch('template')] && (
          <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Info size={13} /> Typical use</p>
            <p className="text-xs text-foreground">{templateGuidance[watch('template')].when}</p>
            <p className="text-xs text-muted-foreground"><strong>What tends to help:</strong> {templateGuidance[watch('template')].practice}</p>
          </div>
        )}
        <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
          {templates.map(t => {
            const isSelected = watch('template') === t.id;
            return (
              <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <input type="radio" value={t.id} className="mt-0.5 accent-primary" {...register('template')} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Dispute items */}
      {selectedClient && (
        <div className="fade-in">
          <label className="label-text">Dispute items to include <span className="text-danger">*</span></label>
          <p className="helper-text">Select the negative items this letter will dispute</p>
          {itemsLoading ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading dispute items…
            </div>
          ) : disputeItems.length === 0 ? (
            <div className="flex items-start gap-2 mt-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                No open dispute items found for this client and bureau. Add a client with a credit report to auto-generate disputes, or add dispute items manually in Client Management.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {disputeItems.map(item => {
                const checked = selectedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-150 ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
                  >
                    {checked ? <CheckSquare size={16} className="text-primary shrink-0" /> : <Square size={16} className="text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.type} · {item.amount} · {item.bureau}</p>
                      {item.disputeReason && <p className="text-xs text-muted-foreground/70 truncate">Reason: {item.disputeReason}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Round + Notes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Dispute round</label>
          <select className="input-field" {...register('round')}>
            {['1', '2', '3', '4'].map(r => <option key={`round-${r}`} value={r}>Round {r}</option>)}
          </select>
          <p className="helper-text mt-1">{watch('round') === '1' ? 'Typically start with a specific, evidence-backed initial dispute.' : 'Later rounds should address the prior response and add a clear reason for reinvestigation—not simply repeat the first letter.'}</p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
        <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Educational guidance only. Results vary by facts, documentation, recipient, and applicable law. Review every letter for accuracy and do not dispute information known to be accurate.</p>
      </div>

      <div>
        <label className="label-text">Additional notes (optional)</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Notes for this letter generation..." {...register('notes')} />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 min-w-[220px] justify-center">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm">{loadingStep || 'Generating…'}</span>
            </>
          ) : (
            <>
              <FileText size={15} />
              Generate Dispute Letter
            </>
          )}
        </button>
      </div>
    </form>
  );
}
