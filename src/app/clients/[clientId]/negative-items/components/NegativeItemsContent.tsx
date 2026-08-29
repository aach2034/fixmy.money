'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Plus, Loader2, ArrowRight, ChevronDown, ChevronUp, FileText, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { DISPUTE_INSTRUCTIONS } from '@/lib/creditReport/parser';
import { selectReliableAuditItems, type SavedAuditItem } from '@/lib/creditReport/auditItems';
import { isCollectionItem } from '@/lib/creditReport/negativeItemClassification';
import DisputeReasonSelect from '@/components/DisputeReasonSelect';
import ImportWizard from '@/components/ImportWizard';

interface NegativeItem {
  id: string;
  bureau: string;
  creditorName: string;
  furnisherName: string;
  accountNumberMasked: string;
  accountType: string;
  negativeReason: string;
  status: string;
  balance: number | null;
  pastDue: number | null;
  dateOpened: string;
  dateReported: string;
  dateLastActivity: string;
  bureausReporting: string[];
  disputeReason: string;
  disputeInstruction: string;
  disputeStatus: string;
  notes: string;
  reportId: string | null;
  isNegative: boolean;
  isCollection: boolean;
}

interface NegativeItemsContentProps {
  clientId: string;
}

function mapRow(row: any): NegativeItem {
  return {
    id: row.id,
    bureau: row.bureau ?? 'Unknown',
    creditorName: row.creditor_name ?? '',
    furnisherName: row.furnisher_name ?? '',
    accountNumberMasked: row.account_number_masked ?? '',
    accountType: row.account_type ?? '',
    negativeReason: row.negative_reason ?? '',
    status: row.status ?? '',
    balance: row.balance ?? null,
    pastDue: row.past_due ?? null,
    dateOpened: row.date_opened ?? '',
    dateReported: row.date_reported ?? '',
    dateLastActivity: row.date_last_activity ?? '',
    bureausReporting: row.bureaus_reporting ?? [row.bureau ?? 'Unknown'],
    disputeReason: row.dispute_reason ?? '',
    disputeInstruction: row.dispute_instruction ?? '',
    disputeStatus: row.dispute_status ?? 'draft',
    notes: row.notes ?? '',
    reportId: row.report_id ?? null,
    isNegative: row.is_negative ?? (row.negative_category !== 'positive'),
    isCollection: row.is_collection ?? (row.negative_category === 'collection'),
  };
}

const BUREAU_COLORS: Record<string, string> = {
  Equifax: 'bureau-eq',
  Experian: 'bureau-ex',
  TransUnion: 'bureau-tu',
  Unknown: 'bg-muted text-muted-foreground border-border',
};

export default function NegativeItemsContent({ clientId }: NegativeItemsContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<NegativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('All');
  const [bureauFilter, setBureauFilter] = useState('All');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<NegativeItem>>({});
  const [creatingRound, setCreatingRound] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [newItem, setNewItem] = useState({ creditorName: '', bureau: 'Equifax', accountType: '', negativeReason: '', balance: '', disputeReason: '', disputeInstruction: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase.from('staff_clients').select('name').eq('id', clientId).eq('owner_id', user.id).single();
      setClientName(clientData?.name ?? 'Client');

      const { data: latestReport, error: reportError } = await supabase
        .from('parsed_credit_reports')
        .select('id')
        .eq('client_id', clientId)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportError) throw reportError;

      let itemsQuery = supabase
        .from('negative_items')
        .select('*')
        .eq('client_id', clientId)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (latestReport?.id) {
        itemsQuery = itemsQuery.or(`report_id.eq.${latestReport.id},report_id.is.null`);
      }

      const { data, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;

      const reliableItems = selectReliableAuditItems((data ?? []) as SavedAuditItem[]);
      setItems((reliableItems as any[]).map(mapRow));
    } catch (err: any) {
      toast.error('Failed to load negative items');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter(item => {
    if (bureauFilter !== 'All' && item.bureau !== bureauFilter) return false;
    if (filter === 'Collections') return isCollectionItem(item);
    if (filter === 'Charge-offs') return /charge.?off/i.test(item.accountType + item.negativeReason);
    if (filter === 'Late Payments') return /late/i.test(item.negativeReason + item.status);
    if (filter === 'Inquiries') return /inquiry/i.test(item.accountType);
    if (filter === 'Public Records') return /public record|bankruptcy/i.test(item.accountType + item.negativeReason);
    if (filter === 'All Items') return true;
    // Default 'All': show items that are marked negative or have a negative reason
    return item.isNegative || item.negativeReason !== '' || /collection|charge.?off|late|derogatory|foreclosure|bankruptcy|repossession|past due/i.test(item.negativeReason + item.accountType + item.status);
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAll = () => setSelected(new Set(filtered.map(i => i.id)));
  const selectByType = (type: string) => {
    const ids = filtered.filter(i => {
      if (type === 'collections') return isCollectionItem(i);
      if (type === 'chargeoffs') return /charge.?off/i.test(i.accountType + i.negativeReason);
      if (type === 'late') return /late/i.test(i.negativeReason + i.status);
      if (type === 'inquiries') return /inquiry/i.test(i.accountType);
      return false;
    }).map(i => i.id);
    setSelected(new Set(ids));
  };

  const saveEdit = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('negative_items').update({
        dispute_reason: editValues.disputeReason,
        dispute_instruction: editValues.disputeInstruction,
        notes: editValues.notes,
        updated_at: new Date().toISOString(),
      }).eq('id', id).eq('owner_id', user.id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...editValues } : i));
      setEditingItem(null);
      toast.success('Item updated');
    } catch {
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('negative_items').delete().eq('id', id).eq('owner_id', user.id);
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('Item removed');
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const addManualItem = async () => {
    if (!newItem.creditorName) { toast.error('Creditor name is required'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('negative_items').insert({
        owner_id: user.id,
        client_id: clientId,
        bureau: newItem.bureau,
        creditor_name: newItem.creditorName,
        account_type: newItem.accountType,
        negative_reason: newItem.negativeReason,
        balance: newItem.balance ? parseFloat(newItem.balance) : null,
        dispute_reason: newItem.disputeReason,
        dispute_instruction: newItem.disputeInstruction,
        bureaus_reporting: [newItem.bureau],
      }).select().single();
      if (error) throw error;
      setItems(prev => [mapRow(data), ...prev]);
      setShowAddForm(false);
      setNewItem({ creditorName: '', bureau: 'Equifax', accountType: '', negativeReason: '', balance: '', disputeReason: '', disputeInstruction: '' });
      toast.success('Item added');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add item');
    }
  };

  const createDisputeRound = async () => {
    if (selected.size === 0) { toast.error('Select at least one item'); return; }
    setCreatingRound(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedItems = items.filter(i => selected.has(i.id));

      // Get next round number
      const { data: existingRounds } = await supabase.from('dispute_rounds').select('round_number').eq('client_id', clientId).eq('owner_id', user.id).order('round_number', { ascending: false }).limit(1);
      const nextRound = (existingRounds?.[0]?.round_number ?? 0) + 1;

      // Group by bureau
      const bureauGroups: Record<string, NegativeItem[]> = {};
      for (const item of selectedItems) {
        const bureaus = item.bureausReporting.length > 0 ? item.bureausReporting : [item.bureau];
        for (const bureau of bureaus) {
          if (!bureauGroups[bureau]) bureauGroups[bureau] = [];
          bureauGroups[bureau].push(item);
        }
      }

      const bureaus = Object.keys(bureauGroups).filter(b => b !== 'Unknown');
      if (bureauGroups['Unknown']) bureaus.push('Unknown');

      // Create dispute round
      const { data: round, error: roundErr } = await supabase.from('dispute_rounds').insert({
        owner_id: user.id,
        client_id: clientId,
        round_number: nextRound,
        title: `Round ${nextRound} — ${new Date().toLocaleDateString()}`,
        status: 'draft',
        items_count: selectedItems.length,
        bureaus,
      }).select().single();

      if (roundErr) throw roundErr;

      // Create round items
      for (const item of selectedItems) {
        const itemBureaus = item.bureausReporting.length > 0 ? item.bureausReporting : [item.bureau];
        for (const bureau of itemBureaus) {
          await supabase.from('dispute_round_items').insert({
            owner_id: user.id,
            round_id: round.id,
            negative_item_id: item.id,
            client_id: clientId,
            bureau,
            creditor_name: item.creditorName,
            account_number_masked: item.accountNumberMasked,
            account_type: item.accountType,
            negative_reason: item.negativeReason,
            dispute_reason: item.disputeReason,
            dispute_instruction: item.disputeInstruction,
            status: 'draft',
          });
        }
      }

      // Update negative items status
      await supabase.from('negative_items').update({ dispute_status: 'ready' }).in('id', [...selected]).eq('owner_id', user.id);

      toast.success(`Dispute Round ${nextRound} created with ${selectedItems.length} items`);
      router.push(`/clients/${clientId}/disputes/${round.id}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create dispute round');
    } finally {
      setCreatingRound(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading negative items…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Negative Items</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clientName} · {items.length} negative items detected</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setShowImportWizard(true)}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Upload size={14} /> Import Report
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn-secondary flex items-center gap-1.5">
            <Plus size={14} /> Add Item
          </button>
          <button
            onClick={createDisputeRound}
            disabled={selected.size === 0 || creatingRound}
            className="btn-primary flex items-center gap-2"
          >
            {creatingRound ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Create Dispute Round ({selected.size})
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: items.length, color: 'text-foreground' },
          { label: 'Collections', value: items.filter(isCollectionItem).length, color: 'text-danger' },
          { label: 'Charge-offs', value: items.filter(i => /charge.?off/i.test(i.accountType + i.negativeReason)).length, color: 'text-warning' },
          { label: 'Late Payments', value: items.filter(i => /late/i.test(i.negativeReason + i.status)).length, color: 'text-warning' },
          { label: 'Selected', value: selected.size, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk select actions */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Select:</span>
        <button onClick={selectAll} className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-muted">All</button>
        <button onClick={() => selectByType('collections')} className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-muted">Collections</button>
        <button onClick={() => selectByType('chargeoffs')} className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-muted">Charge-offs</button>
        <button onClick={() => selectByType('late')} className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-muted">Late Payments</button>
        <button onClick={() => selectByType('inquiries')} className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-muted">Inquiries</button>
        <button onClick={() => setSelected(new Set())} className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground">Clear</button>
        <div className="flex-1" />
        {/* Filters */}
        <select value={filter} onChange={e => setFilter(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-foreground">
          {['All', 'Collections', 'Charge-offs', 'Late Payments', 'Inquiries', 'Public Records', 'All Items'].map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={bureauFilter} onChange={e => setBureauFilter(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-foreground">
          {['All', 'Equifax', 'Experian', 'TransUnion'].map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {/* Add manual item form */}
      {showAddForm && (
        <div className="card p-5 border-primary/30 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Add Manual Item</h3>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Creditor Name *</label>
              <input value={newItem.creditorName} onChange={e => setNewItem(p => ({ ...p, creditorName: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" placeholder="e.g. Midland Credit" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bureau</label>
              <select value={newItem.bureau} onChange={e => setNewItem(p => ({ ...p, bureau: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground">
                {['Equifax', 'Experian', 'TransUnion', 'Unknown'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Account Type</label>
              <input value={newItem.accountType} onChange={e => setNewItem(p => ({ ...p, accountType: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" placeholder="e.g. Collection" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Negative Reason</label>
              <input value={newItem.negativeReason} onChange={e => setNewItem(p => ({ ...p, negativeReason: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" placeholder="e.g. Collection account" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Balance</label>
              <input type="number" value={newItem.balance} onChange={e => setNewItem(p => ({ ...p, balance: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Dispute Reason</label>
              <DisputeReasonSelect value={newItem.disputeReason} onChange={value => setNewItem(p => ({ ...p, disputeReason: value }))} placeholder="Select…" />
            </div>
          </div>
          <button onClick={addManualItem} className="btn-primary text-xs">Add Item</button>
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="text-success mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No negative items found</p>
          <p className="text-sm text-muted-foreground mt-1">Upload and parse a credit report to detect negative items, or add items manually.</p>
          <button onClick={() => router.push('/credit-report-import')} className="btn-primary mt-4">Import Credit Report</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`card border transition-all ${selected.has(item.id) ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 rounded border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{item.creditorName}</span>
                      {item.accountNumberMasked && <span className="text-xs font-mono text-muted-foreground">{item.accountNumberMasked}</span>}
                      <span className={`badge ${BUREAU_COLORS[item.bureau] ?? 'bg-muted text-muted-foreground border-border'}`}>{item.bureau}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">{item.negativeReason || item.accountType}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      {item.accountType && <span>{item.accountType}</span>}
                      {item.balance !== null && <span>Balance: ${item.balance.toLocaleString()}</span>}
                      {item.pastDue !== null && item.pastDue > 0 && <span className="text-danger">Past Due: ${item.pastDue.toLocaleString()}</span>}
                      {item.dateReported && <span>Reported: {item.dateReported}</span>}
                      {item.disputeReason && <span className="text-primary">Reason: {item.disputeReason}</span>}
                    </div>
                    {item.bureausReporting.length > 1 && (
                      <div className="flex gap-1 mt-1">
                        {item.bureausReporting.map(b => (
                          <span key={b} className={`text-xs px-1.5 py-0.5 rounded border ${BUREAU_COLORS[b] ?? 'bg-muted text-muted-foreground border-border'}`}>{b.slice(0, 2)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditingItem(item.id); setEditValues({ disputeReason: item.disputeReason, disputeInstruction: item.disputeInstruction, notes: item.notes }); setExpandedItem(item.id); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                      <FileText size={14} />
                    </button>
                    <button onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                      {expandedItem === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expandedItem === item.id && (
                  <div className="mt-4 border-t border-border pt-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><p className="text-muted-foreground">Date Opened</p><p className="font-medium">{item.dateOpened || '—'}</p></div>
                      <div><p className="text-muted-foreground">Date Reported</p><p className="font-medium">{item.dateReported || '—'}</p></div>
                      <div><p className="text-muted-foreground">Last Activity</p><p className="font-medium">{item.dateLastActivity || '—'}</p></div>
                      <div><p className="text-muted-foreground">Status</p><p className="font-medium">{item.status || '—'}</p></div>
                    </div>

                    {editingItem === item.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Dispute Reason</label>
                            <DisputeReasonSelect value={editValues.disputeReason ?? ''} onChange={value => setEditValues(p => ({ ...p, disputeReason: value }))} placeholder="Select…" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Dispute Instruction</label>
                            <select value={editValues.disputeInstruction ?? ''} onChange={e => setEditValues(p => ({ ...p, disputeInstruction: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground">
                              <option value="">Select…</option>
                              {DISPUTE_INSTRUCTIONS.map(i => <option key={i}>{i}</option>)}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
                            <input value={editValues.notes ?? ''} onChange={e => setEditValues(p => ({ ...p, notes: e.target.value }))} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" placeholder="Add a note…" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(item.id)} className="btn-primary text-xs">Save</button>
                          <button onClick={() => setEditingItem(null)} className="btn-secondary text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs space-y-1">
                        {item.disputeReason && <p><span className="text-muted-foreground">Dispute Reason:</span> {item.disputeReason}</p>}
                        {item.disputeInstruction && <p><span className="text-muted-foreground">Instruction:</span> {item.disputeInstruction}</p>}
                        {item.notes && <p><span className="text-muted-foreground">Notes:</span> {item.notes}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{selected.size} items selected</span>
          <button onClick={createDisputeRound} disabled={creatingRound} className="btn-primary flex items-center gap-2 text-sm">
            {creatingRound ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Create Dispute Round
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          clientId={clientId}
          clientName={clientName}
          onClose={() => setShowImportWizard(false)}
          onComplete={() => {
            setShowImportWizard(false);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
