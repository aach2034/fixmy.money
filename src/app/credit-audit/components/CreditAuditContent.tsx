'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Search, Download, Loader2, FileText, BarChart2 } from 'lucide-react';
import { getReportingBureaus, scoreDisputeStrength, selectReliableAuditItems, type SavedAuditItem } from '@/lib/creditReport/auditItems';
import { deduplicateDisputeRows } from '@/lib/creditReport/disputeItems';
import { prepareAnomalyFindings, type AnomalyFindingView } from '@/lib/disputes/anomalyFindings';
import { trackEvent, trackOrganicConversionStep } from '@/lib/analytics';
import { formatReportedAmount } from '@/lib/creditReport/reviewFlow';

interface AuditClient {
  id: string;
  name: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface AuditResult {
  clientId: string;
  clientName: string;
  generatedAt: string;
  accountCount: number;
  negativeItemCount: number;
  collectionCount: number;
  latePaymentCount: number;
  inquiryCount: number;
  chargeOffCount: number;
  bankruptcyCount: number;
  bureauBreakdown: { bureau: string; count: number; items: string[] }[];
  recommendedStrategy: string[];
  priorityItems: { id: string; creditor: string; accountNumber: string; type: string; bureau: string; amount: string; reason: string; strength: string; anomaly: string; findings: AnomalyFindingView[] }[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

const RISK_CONFIG = {
  low: { label: 'Low Risk', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  medium: { label: 'Medium Risk', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  high: { label: 'High Risk', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  critical: { label: 'Critical', color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/20' },
};

function calcRisk(negCount: number): 'low' | 'medium' | 'high' | 'critical' {
  if (negCount === 0) return 'low';
  if (negCount <= 2) return 'medium';
  if (negCount <= 5) return 'high';
  return 'critical';
}

export default function CreditAuditContent() {
  const searchParams = useSearchParams();
  const requestedClientId = searchParams.get('clientId');
  const requestedReportId = searchParams.get('reportId');
  const autoAuditStarted = useRef(false);
  const [clients, setClients] = useState<AuditClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      setClientsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('staff_clients')
          .select('id, name, email, address, city, state, zip')

          .order('name');
        setClients(data ?? []);
        trackEvent('credit_audit_viewed', { authenticated: true, client_count: data?.length ?? 0 });
      } finally {
        setClientsLoading(false);
      }
    };
    load();
  }, []);

  const runAudit = async (client: AuditClient) => {
    setAuditLoading(client.id);
    trackOrganicConversionStep('credit_audit_started', { client_id: client.id });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let savedItemsQuery = supabase
        .from('negative_items')
        .select('id, creditor_name, furnisher_name, negative_category, bureau, bureaus_reporting, balance, past_due, dispute_reason, negative_reason, dispute_status, is_negative, is_collection, parser_confidence, account_number_masked, account_type, status, remarks, date_opened, date_reported, date_last_activity')

        .eq('client_id', client.id)
        // The import table also stores positive tradelines for review. Audits
        // must only include genuinely negative rows and hard inquiries.
        .or('is_negative.eq.true,negative_category.eq.hard_inquiry');
      if (requestedReportId) savedItemsQuery = savedItemsQuery.eq('report_id', requestedReportId);
      const { data: savedItems, error: itemsError } = await savedItemsQuery;
      if (itemsError) throw itemsError;

      let reportSnapshotsQuery = supabase
        .from('parsed_credit_reports')
        .select('all_accounts')

        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      if (requestedReportId) reportSnapshotsQuery = reportSnapshotsQuery.eq('id', requestedReportId);
      else reportSnapshotsQuery = reportSnapshotsQuery.limit(1);
      const { data: reportSnapshots } = await reportSnapshotsQuery;
      const amountSnapshots = (reportSnapshots ?? []).flatMap((report: any) => Array.isArray(report.all_accounts) ? report.all_accounts : []);
      const savedItemsWithAmounts = (savedItems ?? []).map((item: any) => {
        const snapshot = amountSnapshots.find((account: any) =>
          account.accountNumberMasked === item.account_number_masked
          && account.creditorName === item.creditor_name
        );
        return snapshot ? { ...item, ...snapshot } : item;
      });

      const negativeItems = scoreDisputeStrength(selectReliableAuditItems(savedItemsWithAmounts as SavedAuditItem[]));
      const negativeAccounts = negativeItems.filter(item => item.negative_category !== 'hard_inquiry');

      const bureauMap: Record<string, { count: number; items: string[] }> = {};
      let collectionCount = 0, latePaymentCount = 0, inquiryCount = 0, chargeOffCount = 0, bankruptcyCount = 0;

      for (const item of negativeItems) {
        const reportingBureaus = getReportingBureaus(item);
        for (const bureau of reportingBureaus) {
          if (!bureauMap[bureau]) bureauMap[bureau] = { count: 0, items: [] };
          bureauMap[bureau].count++;
          bureauMap[bureau].items.push(`${item.creditor_name ?? 'Unknown'} (${item.negative_category ?? 'item'})`);
        }

        const type = item.negative_category ?? '';
        if (type === 'collection') collectionCount++;
        else if (type === 'late_payment') latePaymentCount++;
        else if (type === 'hard_inquiry') inquiryCount++;
        else if (type === 'charge_off') chargeOffCount++;
        else if (type === 'bankruptcy') bankruptcyCount++;
      }

      const bureauBreakdown = Object.entries(bureauMap).map(([bureau, data]) => ({
        bureau,
        count: data.count,
        items: data.items,
      }));

      const uniqueScoredItems = deduplicateDisputeRows(negativeItems);
      const priorityItems = uniqueScoredItems.slice(0, 5).map((d: any) => ({
        id: d.id,
        creditor: d.creditor_name ?? 'Unknown',
        accountNumber: d.account_number_masked ?? '',
        type: d.negative_category ?? 'item',
        bureau: getReportingBureaus(d).join(', ') || d.bureau || 'Unknown',
        amount: formatReportedAmount({ ...d, balance: d.balance == null ? null : Number(d.balance), pastDue: d.past_due == null ? null : Number(d.past_due) }),
        reason: d.disputeStrength.recommendedReason,
        strength: d.disputeStrength.strengthLabel,
        anomaly: d.disputeStrength.strongestAnomaly,
        findings: prepareAnomalyFindings(d.disputeStrength.findings),
      }));

      const strategy: string[] = [];
      const strongCount = uniqueScoredItems.filter(item => item.disputeStrength.strengthLabel === 'Strong').length;
      const moderateCount = uniqueScoredItems.filter(item => item.disputeStrength.strengthLabel === 'Moderate').length;
      if (strongCount > 0) strategy.push(`Prioritize ${strongCount} strong factual dispute${strongCount !== 1 ? 's' : ''} first — each has a specific anomaly detected in the imported report data`);
      else if (moderateCount > 0) strategy.push(`Review ${moderateCount} moderate factual dispute${moderateCount !== 1 ? 's' : ''} — confirm details before using them in a first-round letter`);
      if (collectionCount > 0) strategy.push(`Dispute ${collectionCount} collection account${collectionCount !== 1 ? 's' : ''} — request debt validation and verify reporting accuracy`);
      if (chargeOffCount > 0) strategy.push(`Address ${chargeOffCount} charge-off${chargeOffCount !== 1 ? 's' : ''} — verify balance accuracy and date of last activity`);
      if (latePaymentCount > 0) strategy.push(`Dispute ${latePaymentCount} late payment${latePaymentCount !== 1 ? 's' : ''} — request method of verification`);
      if (inquiryCount > 0) strategy.push(`Review ${inquiryCount} hard ${inquiryCount !== 1 ? 'inquiries' : 'inquiry'} — dispute any unauthorized inquiries`);
      if (bankruptcyCount > 0) strategy.push('Verify bankruptcy record accuracy — check dates, amounts, and discharge status');
      if (strategy.length === 0) strategy.push('No saved negative items were found. Import and review a credit report before creating a dispute strategy.');

      const accountCount = requestedReportId
        ? (Array.isArray(reportSnapshots?.[0]?.all_accounts) ? reportSnapshots[0].all_accounts.length : 0)
        : amountSnapshots.length;
      const result: AuditResult = {
        clientId: client.id,
        clientName: client.name,
        generatedAt: new Date().toLocaleString(),
        accountCount,
        negativeItemCount: negativeAccounts.length,
        collectionCount,
        latePaymentCount,
        inquiryCount,
        chargeOffCount,
        bankruptcyCount,
        bureauBreakdown,
        recommendedStrategy: strategy,
        priorityItems,
        overallRisk: calcRisk(negativeAccounts.length),
      };

      setAuditResult(result);
      trackOrganicConversionStep('credit_audit_completed', {
        client_id: client.id,
        negative_items_count: result.negativeItemCount,
        priority_items_count: result.priorityItems.length,
      });
      toast.success(`Credit audit complete for ${client.name}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Audit failed');
    } finally {
      setAuditLoading(null);
    }
  };

  useEffect(() => {
    const requestedClient = clients.find(client => client.id === requestedClientId);
    if (!requestedClient || autoAuditStarted.current) return;
    autoAuditStarted.current = true;
    void runAudit(requestedClient);
  }, [clients, requestedClientId]);

  const handleExportAudit = () => {
    if (!auditResult) return;
    const content = `CREDIT AUDIT REPORT
Client: ${auditResult.clientName}
Generated: ${auditResult.generatedAt}
Overall Risk: ${RISK_CONFIG[auditResult.overallRisk].label}

SUMMARY
Accounts: ${auditResult.accountCount}
Negative Items: ${auditResult.negativeItemCount}
Collections: ${auditResult.collectionCount}
Late Payments: ${auditResult.latePaymentCount}
Hard Inquiries: ${auditResult.inquiryCount}
Charge-Offs: ${auditResult.chargeOffCount}
Bankruptcies: ${auditResult.bankruptcyCount}

BUREAU BREAKDOWN
${auditResult.bureauBreakdown.map(b => `${b.bureau}: ${b.count} item(s)\n${b.items.map(i => `  - ${i}`).join('\n')}`).join('\n\n')}

RECOMMENDED DISPUTE STRATEGY
${auditResult.recommendedStrategy.map((s, i) => `${i + 1}. ${s}`).join('\n')}

PRIORITY ITEMS
${auditResult.priorityItems.map((p, i) => `${i + 1}. ${p.creditor} (${p.type}) — ${p.bureau} — ${p.amount}\n${p.findings.map((finding, findingIndex) => `   Finding ${findingIndex + 1}: ${finding.title}\n   Dispute Strength: ${finding.strengthLabel}\n   Discrepancy: ${finding.discrepancy}\n   Reported Data: ${finding.reportedData}\n   Factual Basis: ${finding.factualBasis}\n   Dispute Reason: ${finding.disputeReason}`).join('\n\n')}`).join('\n\n')}

---
DISCLAIMER: This audit is generated by FixMy.Money business software for credit repair professionals. It does not constitute legal advice or guarantee any credit outcome.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-audit-${auditResult.clientName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Audit exported');
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-page page-stack max-w-5xl">
      <div className="page-header mb-0">
        <div>
          <p className="text-sm font-semibold text-green-700">What FixMy.Money found</p>
          <h1 className="page-title mt-2">Credit Audit</h1>
          <p className="page-description">Choose a client. We will show the most important findings first.</p>
        </div>
        {auditResult && (
          <button onClick={handleExportAudit} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Export Audit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Client list */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="input-field pl-8" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card divide-y divide-border max-h-[600px] overflow-y-auto">
            {clientsLoading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading clients…
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No clients found</div>
            ) : (
              filteredClients.map(client => (
                <div key={client.id} className={`p-3 flex items-center justify-between hover:bg-muted/30 transition-colors ${auditResult?.clientId === client.id ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      {client.email && <p className="text-xs text-muted-foreground truncate">{client.email}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => runAudit(client)}
                    disabled={auditLoading === client.id}
                    className="btn-primary text-xs px-3 py-1.5 shrink-0 ml-2 disabled:opacity-40"
                  >
                    {auditLoading === client.id ? <Loader2 size={12} className="animate-spin" /> : 'Review'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit result */}
        <div className="lg:col-span-2">
          {!auditResult ? (
            <div className="card p-10 flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart2 size={28} className="text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Select a client to run a credit audit</p>
                <p className="text-sm text-muted-foreground mt-1">We will summarize what matters and recommend the next action.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className={`card p-4 flex items-center justify-between border ${RISK_CONFIG[auditResult.overallRisk].border}`}>
                <div>
                  <p className="text-base font-semibold text-foreground">{auditResult.clientName}</p>
                  <p className="text-xs text-muted-foreground">Analysis completed {auditResult.generatedAt}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${RISK_CONFIG[auditResult.overallRisk].bg} ${RISK_CONFIG[auditResult.overallRisk].color}`}>
                  {RISK_CONFIG[auditResult.overallRisk].label}
                </div>
              </div>

              {/* Stats */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: 'Accounts', value: auditResult.accountCount, color: 'text-slate-950' },
                  { label: 'Negative items', value: auditResult.negativeItemCount, color: 'text-slate-950' },
                  { label: 'Collections', value: auditResult.collectionCount, color: 'text-slate-950' },
                  { label: 'Charge-offs', value: auditResult.chargeOffCount, color: 'text-slate-950' },
                  { label: 'Inquiries', value: auditResult.inquiryCount, color: 'text-slate-950' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-slate-50 p-5">
                    <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Bureau breakdown */}
              {auditResult.bureauBreakdown.length > 0 && (
                <details className="card p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">View bureau and account details</summary>
                  <div className="mt-4 space-y-3">
                    {['Equifax', 'Experian', 'TransUnion'].map(bureau => {
                      const data = auditResult.bureauBreakdown.find(b => b.bureau === bureau);
                      const count = data?.count ?? 0;
                      return (
                        <div key={bureau}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">{bureau}</span>
                            <span className="text-xs text-muted-foreground">{count} item{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min(100, (count / Math.max(auditResult.negativeItemCount, 1)) * 100)}%` }}
                            />
                          </div>
                          {data?.items && data.items.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{data.items.slice(0, 2).join(', ')}{data.items.length > 2 ? ` +${data.items.length - 2} more` : ''}</p>
                          )}
                        </div>
                      );
                    })}
                  </div></details>
              )}

              {/* Recommended strategy */}
              <details className="card p-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">View full recommended strategy</summary>
                <div className="space-y-2">
                  {auditResult.recommendedStrategy.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-sm text-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </details>

              {/* Priority items */}
              {auditResult.priorityItems.length > 0 && (
                <div className="card p-5 space-y-4">
                  <div><p className="text-sm font-semibold text-green-700">Recommended next action</p><h3 className="mt-1 text-xl font-semibold text-foreground">Review your strongest findings</h3></div>
                  <div className="space-y-2">
                    {auditResult.priorityItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
                        <span className="status-pill shrink-0 border-red-200 bg-red-50 text-red-700">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-foreground">{item.creditor}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.bureau} · {item.amount}</p>
                          <div className="mt-2 space-y-2">
                            {item.findings.map(finding => (
                              <div key={`${finding.issueType}-${finding.reportedData}`} className="rounded-xl bg-slate-50 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">{finding.strengthLabel} dispute opportunity</span>
                                </div>
                                <p className="mt-2 text-sm text-slate-700">{finding.discrepancy}</p>
                                <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-semibold text-slate-700">View supporting details</summary><div className="mt-2 space-y-1">{finding.reportedData && <p><span className="font-medium text-foreground">Reported data:</span> {finding.reportedData}</p>}<p><span className="font-medium text-foreground">Why it matters:</span> {finding.factualBasis}</p><p><span className="font-medium text-foreground">Recommended reason:</span> {finding.disputeReason}</p></div></details>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleExportAudit} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Download size={14} /> Export Audit Report
                </button>
                <a href={`/dispute-wizard?clientId=${auditResult.clientId}&clientName=${encodeURIComponent(auditResult.clientName)}&fromReport=true${requestedReportId ? `&reportId=${encodeURIComponent(requestedReportId)}` : ''}${auditResult.priorityItems[0] ? `&findingId=${encodeURIComponent(auditResult.priorityItems[0].id)}&findingCreditor=${encodeURIComponent(auditResult.priorityItems[0].creditor)}&findingAccount=${encodeURIComponent(auditResult.priorityItems[0].accountNumber)}&bureau=${encodeURIComponent(auditResult.priorityItems[0].bureau.split(',')[0].trim())}` : ''}`} onClick={() => trackOrganicConversionStep('dispute_wizard_start_clicked', { source: 'credit_audit' })} className="btn-primary flex items-center gap-1.5 text-sm">
                  <FileText size={14} /> Start Dispute
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
