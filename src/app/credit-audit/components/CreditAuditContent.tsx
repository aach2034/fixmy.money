'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Search, AlertTriangle, Download, Loader2, TrendingDown, FileText, Clock, Users, BarChart2, Info } from 'lucide-react';

interface AuditClient {
  id: string;
  name: string;
  email?: string;
}

interface AuditResult {
  clientId: string;
  clientName: string;
  generatedAt: string;
  negativeItemCount: number;
  collectionCount: number;
  latePaymentCount: number;
  inquiryCount: number;
  chargeOffCount: number;
  bankruptcyCount: number;
  bureauBreakdown: { bureau: string; count: number; items: string[] }[];
  recommendedStrategy: string[];
  priorityItems: { creditor: string; type: string; bureau: string; amount: string; reason: string }[];
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
          .select('id, name, email')
          .eq('owner_id', user.id)
          .order('name');
        setClients(data ?? []);
      } finally {
        setClientsLoading(false);
      }
    };
    load();
  }, []);

  const runAudit = async (client: AuditClient) => {
    setAuditLoading(client.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: savedItems, error: itemsError } = await supabase
        .from('negative_items')
        .select('creditor_name, negative_category, bureau, balance, dispute_reason, negative_reason, dispute_status')
        .eq('owner_id', user.id)
        .eq('client_id', client.id);
      if (itemsError) throw itemsError;

      const items = savedItems ?? [];
      const negativeItems = items.filter((d: any) => !['deleted', 'closed'].includes(d.dispute_status));

      const bureauMap: Record<string, { count: number; items: string[] }> = {};
      let collectionCount = 0, latePaymentCount = 0, inquiryCount = 0, chargeOffCount = 0, bankruptcyCount = 0;

      for (const item of negativeItems) {
        const bureau = item.bureau ?? 'Unknown';
        if (!bureauMap[bureau]) bureauMap[bureau] = { count: 0, items: [] };
        bureauMap[bureau].count++;
        bureauMap[bureau].items.push(`${item.creditor_name ?? 'Unknown'} (${item.negative_category ?? 'item'})`);

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

      const priorityItems = negativeItems.slice(0, 5).map((d: any) => ({
        creditor: d.creditor_name ?? 'Unknown',
        type: d.negative_category ?? 'item',
        bureau: d.bureau ?? 'Unknown',
        amount: d.balance != null ? `$${Number(d.balance).toLocaleString()}` : '—',
        reason: d.dispute_reason || d.negative_reason || 'Review for inaccuracies',
      }));

      const strategy: string[] = [];
      if (collectionCount > 0) strategy.push(`Dispute ${collectionCount} collection account${collectionCount !== 1 ? 's' : ''} — request debt validation and verify reporting accuracy`);
      if (chargeOffCount > 0) strategy.push(`Address ${chargeOffCount} charge-off${chargeOffCount !== 1 ? 's' : ''} — verify balance accuracy and date of last activity`);
      if (latePaymentCount > 0) strategy.push(`Dispute ${latePaymentCount} late payment${latePaymentCount !== 1 ? 's' : ''} — request method of verification`);
      if (inquiryCount > 0) strategy.push(`Review ${inquiryCount} hard ${inquiryCount !== 1 ? 'inquiries' : 'inquiry'} — dispute any unauthorized inquiries`);
      if (bankruptcyCount > 0) strategy.push('Verify bankruptcy record accuracy — check dates, amounts, and discharge status');
      if (strategy.length === 0) strategy.push('No saved negative items were found. Import and review a credit report before creating a dispute strategy.');

      const result: AuditResult = {
        clientId: client.id,
        clientName: client.name,
        generatedAt: new Date().toLocaleString(),
        negativeItemCount: negativeItems.length,
        collectionCount,
        latePaymentCount,
        inquiryCount,
        chargeOffCount,
        bankruptcyCount,
        bureauBreakdown,
        recommendedStrategy: strategy,
        priorityItems,
        overallRisk: calcRisk(negativeItems.length),
      };

      setAuditResult(result);
      toast.success(`Credit audit complete for ${client.name}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Audit failed');
    } finally {
      setAuditLoading(null);
    }
  };

  const handleExportAudit = () => {
    if (!auditResult) return;
    const content = `CREDIT AUDIT REPORT
Client: ${auditResult.clientName}
Generated: ${auditResult.generatedAt}
Overall Risk: ${RISK_CONFIG[auditResult.overallRisk].label}

SUMMARY
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
${auditResult.priorityItems.map((p, i) => `${i + 1}. ${p.creditor} (${p.type}) — ${p.bureau} — ${p.amount}\n   Reason: ${p.reason}`).join('\n\n')}

---
DISCLAIMER: This audit is generated by FixMy.Money business software for credit repair professionals. It is a staff-reviewed draft and does not constitute legal advice or guarantee any credit outcome. Staff must review all items before taking action.`;

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
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Credit Audit Tool</h1>
          <p className="text-sm text-muted-foreground mt-0.5">One-click client credit audit with bureau-by-bureau comparison and dispute strategy</p>
        </div>
        {auditResult && (
          <button onClick={handleExportAudit} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Export Audit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    {auditLoading === client.id ? <Loader2 size={12} className="animate-spin" /> : 'Audit'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit result */}
        <div className="lg:col-span-2">
          {!auditResult ? (
            <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BarChart2 size={28} className="text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Select a client to run a credit audit</p>
                <p className="text-sm text-muted-foreground mt-1">One-click audit generates a bureau-by-bureau breakdown and recommended dispute strategy</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className={`card p-4 flex items-center justify-between border ${RISK_CONFIG[auditResult.overallRisk].border}`}>
                <div>
                  <p className="text-base font-semibold text-foreground">{auditResult.clientName}</p>
                  <p className="text-xs text-muted-foreground">Audit generated: {auditResult.generatedAt}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${RISK_CONFIG[auditResult.overallRisk].bg} ${RISK_CONFIG[auditResult.overallRisk].color}`}>
                  {RISK_CONFIG[auditResult.overallRisk].label}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Negative Items', value: auditResult.negativeItemCount, icon: AlertTriangle, color: 'text-danger' },
                  { label: 'Collections', value: auditResult.collectionCount, icon: TrendingDown, color: 'text-danger' },
                  { label: 'Late Payments', value: auditResult.latePaymentCount, icon: Clock, color: 'text-warning' },
                  { label: 'Hard Inquiries', value: auditResult.inquiryCount, icon: Users, color: 'text-warning' },
                  { label: 'Charge-Offs', value: auditResult.chargeOffCount, icon: FileText, color: 'text-orange-600' },
                  { label: 'Bankruptcies', value: auditResult.bankruptcyCount, icon: AlertTriangle, color: 'text-danger' },
                ].map(s => (
                  <div key={s.label} className="card p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Bureau breakdown */}
              {auditResult.bureauBreakdown.length > 0 && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Bureau-by-Bureau Breakdown</h3>
                  <div className="space-y-3">
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
                  </div>
                </div>
              )}

              {/* Recommended strategy */}
              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Recommended Dispute Strategy</h3>
                <div className="space-y-2">
                  {auditResult.recommendedStrategy.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-sm text-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority items */}
              {auditResult.priorityItems.length > 0 && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Priority Dispute Items</h3>
                  <div className="space-y-2">
                    {auditResult.priorityItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <span className="text-xs font-bold text-danger bg-danger/10 rounded px-1.5 py-0.5 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.creditor}</p>
                          <p className="text-xs text-muted-foreground">{item.type} · {item.bureau} · {item.amount}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Staff review required.</strong> This audit is a starting point for dispute strategy. All items must be verified by an authorized staff member before generating dispute letters. FixMy.Money provides business software and does not guarantee credit outcomes.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={handleExportAudit} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Download size={14} /> Export Audit Report
                </button>
                <a href={`/dispute-wizard`} className="btn-primary flex items-center gap-1.5 text-sm">
                  <FileText size={14} /> Start Dispute Wizard
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
