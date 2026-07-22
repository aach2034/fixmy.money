'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Download, Eye, Edit2, Trash2, ChevronUp, ChevronDown, X, UserCheck, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import AddClientForm from './AddClientForm';
import ClientDetailDrawer from './ClientDetailDrawer';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type CaseStage = 'lead' | 'enrolled' | 'active' | 'onhold' | 'completed' | 'churned';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  enrolledDate: string;
  caseStage: CaseStage;
  activeDisputes: number;
  itemsDeleted: number;
  subscriptionStatus: 'paid' | 'overdue' | 'pending';
  plan: string;
  lastActivity: string;
  nextTaskDue: string;
  nextTaskLabel: string;
  assignedStaff: string;
  bureaus: string[];
  score: number;
  reportAnalyzed: boolean;
}

const stageOptions = ['All Stages', 'lead', 'enrolled', 'active', 'onhold', 'completed', 'churned'];
const subStatusOptions = ['All Billing', 'paid', 'overdue', 'pending'];

type SortField = 'name' | 'enrolledDate' | 'activeDisputes' | 'itemsDeleted' | 'nextTaskDue';

function mapRow(row: any): Client {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    enrolledDate: row.enrolled_date
      ? new Date(row.enrolled_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : '',
    caseStage: (row.case_stage ?? 'lead') as CaseStage,
    activeDisputes: row.active_disputes ?? 0,
    itemsDeleted: row.items_deleted ?? 0,
    subscriptionStatus: (row.subscription_status ?? 'pending') as 'paid' | 'overdue' | 'pending',
    plan: row.plan ?? 'Starter',
    lastActivity: row.last_activity ?? '',
    nextTaskDue: row.next_task_due ?? '',
    nextTaskLabel: row.next_task_label ?? '',
    assignedStaff: row.assigned_staff ?? '',
    bureaus: row.bureaus ?? [],
    score: row.credit_score ?? 0,
    reportAnalyzed: row.report_analyzed ?? false,
  };
}

export default function ClientManagementContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [subFilter, setSubFilter] = useState('All Billing');
  const [sortField, setSortField] = useState<SortField>('enrolledDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const staffOptions = useMemo(() => ['All Staff', ...Array.from(new Set(clients.map(client => client.assignedStaff).filter(Boolean)))], [clients]);

  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error: fetchError } = await supabase
        .from('staff_clients')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code?.startsWith('42')) throw fetchError;
        setError(fetchError.message);
        return;
      }
      setClients((data ?? []).map(mapRow));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleDeleteClient = async (id: string) => {
    try {
      const { error: delError } = await supabase
        .from('staff_clients')
        .delete()
        .eq('id', id);
      if (delError) throw delError;
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Client removed and archived');
    } catch (err: any) {
      toast.error('Failed to remove client');
    }
    setDeleteConfirm(null);
  };

  const filtered = useMemo(() => {
    let data = [...clients];
    if (search) data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
    if (stageFilter !== 'All Stages') data = data.filter(c => c.caseStage === stageFilter);
    if (staffFilter !== 'All Staff') data = data.filter(c => c.assignedStaff === staffFilter);
    if (subFilter !== 'All Billing') data = data.filter(c => c.subscriptionStatus === subFilter);
    data.sort((a, b) => {
      let av: string | number = a[sortField as keyof Client] as string | number;
      let bv: string | number = b[sortField as keyof Client] as string | number;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return data;
  }, [clients, search, stageFilter, staffFilter, subFilter, sortField, sortDir]);

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map(c => c.id)));
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp size={10} className={sortField === field && sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/40'} />
      <ChevronDown size={10} className={sortField === field && sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/40'} />
    </span>
  );

  const bureauBadgeClass: Record<string, string> = { EQ: 'bureau-eq', EX: 'bureau-ex', TU: 'bureau-tu' };

  if (loading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Loading clients…</p>
          </div>
        </div>
        <div className="card p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading client roster…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={32} className="text-danger" />
          <p className="text-sm font-semibold text-foreground">Failed to load clients</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button onClick={fetchClients} className="btn-primary mt-2">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} clients in your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Export
          </button>
          <button onClick={() => setAddModalOpen(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Add Client
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Clients', value: clients.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active Cases', value: clients.filter(c => c.caseStage === 'active').length, icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Overdue Billing', value: clients.filter(c => c.subscriptionStatus === 'overdue').length, icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' },
          { label: 'Reports Analyzed', value: clients.filter(c => c.reportAnalyzed).length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
        ].map((s) => {
          const StatIcon = s.icon;
          return (
            <div key={`stat-${s.label}`} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <StatIcon size={17} className={s.color} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-1.5 ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
          >
            <Filter size={15} /> Filters
            {(stageFilter !== 'All Stages' || staffFilter !== 'All Staff' || subFilter !== 'All Billing') && (
              <span className="w-4 h-4 bg-primary text-white rounded-full text-2xs flex items-center justify-center font-bold">!</span>
            )}
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border fade-in">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Case Stage</label>
              <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setCurrentPage(1); }} className="input-field text-xs py-1.5 w-36">
                {stageOptions.map(o => <option key={`stage-opt-${o}`} value={o}>{o === 'All Stages' ? o : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned Staff</label>
              <select value={staffFilter} onChange={e => { setStaffFilter(e.target.value); setCurrentPage(1); }} className="input-field text-xs py-1.5 w-40">
                {staffOptions.map(o => <option key={`staff-opt-${o}`} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Billing Status</label>
              <select value={subFilter} onChange={e => { setSubFilter(e.target.value); setCurrentPage(1); }} className="input-field text-xs py-1.5 w-36">
                {subStatusOptions.map(o => <option key={`sub-opt-${o}`} value={o}>{o === 'All Billing' ? o : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setStageFilter('All Stages'); setStaffFilter('All Staff'); setSubFilter('All Billing'); }}
              className="btn-ghost flex items-center gap-1 text-xs mt-4"
            >
              <X size={12} /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-foreground text-background rounded-xl px-5 py-3 shadow-xl slide-up">
          <span className="text-sm font-semibold">{selectedRows.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button className="text-sm font-medium hover:text-white/80 transition-colors" onClick={() => toast.success(`Assigned ${selectedRows.size} clients`)}>Reassign Staff</button>
          <button className="text-sm font-medium hover:text-white/80 transition-colors" onClick={() => toast.success(`Exported ${selectedRows.size} clients`)}>Export Selected</button>
          <button className="text-sm font-medium text-danger hover:text-red-300 transition-colors" onClick={() => toast.error(`Removed ${selectedRows.size} clients`)}>Remove</button>
          <button onClick={() => setSelectedRows(new Set())} className="ml-2 p-1 hover:bg-white/10 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="table-header w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-input accent-primary"
                    aria-label="Select all"
                  />
                </th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <span className="flex items-center">Client <SortIcon field="name" /></span>
                </th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('enrolledDate')}>
                  <span className="flex items-center">Enrolled <SortIcon field="enrolledDate" /></span>
                </th>
                <th className="table-header">Stage</th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('activeDisputes')}>
                  <span className="flex items-center">Disputes <SortIcon field="activeDisputes" /></span>
                </th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('itemsDeleted')}>
                  <span className="flex items-center">Deleted <SortIcon field="itemsDeleted" /></span>
                </th>
                <th className="table-header">Billing</th>
                <th className="table-header">Report</th>
                <th className="table-header">Last Activity</th>
                <th className="table-header">Next Task</th>
                <th className="table-header">Staff</th>
                <th className="table-header w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <EmptyState
                      icon={Users}
                      title="No clients found"
                      description="No clients match your current filters. Add your first client to get started."
                      action={{ label: 'Add First Client', onClick: () => setAddModalOpen(true) }}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((client) => (
                  <tr
                    key={client.id}
                    className={`border-b border-border row-hover ${selectedRows.has(client.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(client.id)}
                        onChange={() => toggleRow(client.id)}
                        className="w-4 h-4 rounded border-input accent-primary"
                        aria-label={`Select ${client.name}`}
                      />
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                        {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                      </div>
                    </td>
                    <td className="table-cell text-muted-foreground">{client.enrolledDate}</td>
                    <td className="table-cell">
                      <StatusBadge status={client.caseStage} />
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground tabular-nums">{client.activeDisputes}</span>
                        <div className="flex gap-0.5">
                          {client.bureaus?.map(b => (
                            <span key={`${client.id}-bureau-${b}`} className={`badge ${bureauBadgeClass[b] ?? ''} text-2xs px-1 py-0`}>{b}</span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-success tabular-nums">{client.itemsDeleted}</span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <StatusBadge status={client.subscriptionStatus} />
                        <p className="text-xs text-muted-foreground mt-0.5">{client.plan}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      {client.reportAnalyzed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Analyzed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="table-cell text-muted-foreground text-xs">{client.lastActivity}</td>
                    <td className="table-cell">
                      {client.nextTaskDue === 'Overdue' ? (
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-danger" />
                          <span className="text-xs text-danger font-medium">{client.nextTaskLabel}</span>
                        </div>
                      ) : !client.nextTaskDue || client.nextTaskDue === '—' ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-foreground">{client.nextTaskLabel}</p>
                          <p className="text-xs text-muted-foreground">{client.nextTaskDue}</p>
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xs font-bold">
                          {client.assignedStaff?.split(' ').map(n => n[0]).join('') ?? '?'}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[80px]">{client.assignedStaff?.split(' ')[0] ?? ''}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDrawerClient(client)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          title="View client details"
                        >
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          title="Edit client"
                        >
                          <Edit2 size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(client.id)}
                          className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                          title="Remove client"
                        >
                          <Trash2 size={14} className="text-muted-foreground hover:text-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length} clients
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={`page-${i + 1}`}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Client"
        subtitle="Enroll a new client and optionally upload their credit report for AI analysis"
        size="lg"
      >
        <AddClientForm onClose={() => { setAddModalOpen(false); fetchClients(); }} />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Client" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to remove this client? All associated disputes, letters, and billing records will be archived. This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => deleteConfirm && handleDeleteClient(deleteConfirm)} className="btn-danger">Remove Client</button>
          </div>
        </div>
      </Modal>

      {/* Client Detail Drawer */}
      {drawerClient && (
        <ClientDetailDrawer client={drawerClient} onClose={() => setDrawerClient(null)} />
      )}
    </div>
  );
}
