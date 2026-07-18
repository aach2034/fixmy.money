'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, FileText, Upload, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, X, Paperclip, RefreshCw } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

import ClientChatWidget from './ClientChatWidget';
import AffiliateProviderCard, { AffiliateDisclosure } from '@/components/AffiliateProviderCard';
import { DEFAULT_PROVIDERS } from '@/lib/affiliates/reportProviders';


interface ClientAccount {
  id: string;
  email: string;
  full_name: string;
  phone: string;
}

interface Dispute {
  id: string;
  case_number: string;
  title: string;
  bureau: string;
  dispute_status: string;
  description: string;
  opened_at: string;
  resolved_at: string | null;
}

interface TimelineEvent {
  id: string;
  dispute_id: string;
  event_title: string;
  event_description: string;
  event_date: string;
}

interface ClientUpdate {
  id: string;
  dispute_id: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ClientDocument {
  id: string;
  dispute_id: string | null;
  file_name: string;
  file_url: string;
  doc_status: string;
  uploaded_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',     color: 'text-warning bg-warning/10 border-warning/20',   icon: Clock },
  in_review:  { label: 'In Review',   color: 'text-info bg-info/10 border-info/20',             icon: RefreshCw },
  submitted:  { label: 'Submitted',   color: 'text-primary bg-primary/10 border-primary/20',   icon: FileText },
  resolved:   { label: 'Resolved',    color: 'text-success bg-success/10 border-success/20',   icon: CheckCircle2 },
  closed:     { label: 'Closed',      color: 'text-muted-foreground bg-muted border-border',   icon: X },
};

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'text-warning bg-warning/10' },
  uploaded:  { label: 'Uploaded',  color: 'text-info bg-info/10' },
  reviewed:  { label: 'Reviewed',  color: 'text-primary bg-primary/10' },
  approved:  { label: 'Approved',  color: 'text-success bg-success/10' },
  rejected:  { label: 'Rejected',  color: 'text-danger bg-danger/10' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
  const Ico = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Ico size={11} />
      {cfg.label}
    </span>
  );
}

export default function ClientPortalDashboardContent() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [updates, setUpdates] = useState<ClientUpdate[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'disputes' | 'updates' | 'documents'>('disputes');
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const providers = DEFAULT_PROVIDERS.filter(p => p.isVisible);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client-portal/login'); return; }

      const { data: acct } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!acct) { router.push('/client-portal/login'); return; }
      setAccount(acct);

      const { data: disp } = await supabase
        .from('client_disputes')
        .select('*')
        .eq('client_id', acct.id)
        .order('opened_at', { ascending: false });
      setDisputes(disp || []);

      if (disp && disp.length > 0) {
        const disputeIds = disp.map((d: Dispute) => d.id);
        const { data: tl } = await supabase
          .from('dispute_timeline_events')
          .select('*')
          .in('dispute_id', disputeIds)
          .order('event_date', { ascending: true });
        setTimeline(tl || []);
      }

      const { data: upd } = await supabase
        .from('client_updates')
        .select('*')
        .eq('client_id', acct.id)
        .order('created_at', { ascending: false });
      setUpdates(upd || []);

      const { data: docs } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', acct.id)
        .order('uploaded_at', { ascending: false });
      setDocuments(docs || []);

      if (disp && disp.length > 0) setExpandedDispute(disp[0].id);
    } catch {
      router.push('/client-portal/login');
    } finally {
      setLoading(false);
    }
  }

  async function markUpdateRead(updateId: string) {
    await supabase.from('client_updates').update({ is_read: true }).eq('id', updateId);
    setUpdates((prev) => prev.map((u) => u.id === updateId ? { ...u, is_read: true } : u));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    setUploadError('');
    setUploadSuccess('');

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only PDF, JPG, PNG, and WEBP files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10 MB.');
      return;
    }

    try {
      const filePath = `client-documents/${account.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, { upsert: false });

      let fileUrl = filePath;
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(filePath);
        fileUrl = urlData?.publicUrl || filePath;
      }

      const { error: dbErr } = await supabase.from('client_documents').insert({
        client_id: account.id,
        dispute_id: uploadingFor || null,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.type,
        doc_status: 'uploaded',
      });

      if (dbErr) throw dbErr;
      setUploadSuccess(`"${file.name}" uploaded successfully.`);
      setUploadingFor(null);
      loadData();
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed. Please try again.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/client-portal/login');
  }

  const unreadCount = updates.filter((u) => !u.is_read).length;
  const hasCreditReport = documents.some(d =>
    d.file_name?.toLowerCase().includes('credit') ||
    d.file_name?.toLowerCase().endsWith('.pdf')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo size={32} />
          <div>
            <span className="font-bold text-foreground text-sm">Fix My Money</span>
            <span className="block text-muted-foreground text-xs">Client Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('updates')}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-2xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {account?.full_name?.charAt(0) || 'C'}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">{account?.full_name}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Hello, {account?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here is the latest status on your credit repair cases.
          </p>
        </div>

        {/* Credit Report CTA — shown when no report uploaded yet */}
        {!hasCreditReport && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Credit Report Required</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  To begin your credit audit, please provide a current 3-bureau credit report.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map(provider => (
                <AffiliateProviderCard
                  key={provider.key}
                  provider={provider}
                  sourcePage="client-portal"
                  clientId={account?.id}
                  compact={true}
                />
              ))}
            </div>

            <AffiliateDisclosure />

            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => {
                setActiveTab('documents');
                setUploadingFor(null);
                setUploadError('');
                setUploadSuccess('');
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 text-sm font-semibold text-muted-foreground hover:text-primary transition-all"
            >
              <Upload size={16} />
              Upload Existing Report
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Cases', value: disputes.filter((d) => !['resolved','closed'].includes(d.dispute_status)).length, color: 'text-primary' },
            { label: 'Resolved', value: disputes.filter((d) => d.dispute_status === 'resolved').length, color: 'text-success' },
            { label: 'Unread Updates', value: unreadCount, color: 'text-warning' },
            { label: 'Documents', value: documents.length, color: 'text-info' },
          ].map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-4">
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(['disputes', 'updates', 'documents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'updates' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-danger text-white text-2xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="space-y-3">
            {disputes.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No dispute cases yet.</p>
              </div>
            ) : (
              disputes.map((dispute) => {
                const isExpanded = expandedDispute === dispute.id;
                const disputeTimeline = timeline.filter((t) => t.dispute_id === dispute.id);
                return (
                  <div key={dispute.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDispute(isExpanded ? null : dispute.id)}
                      className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{dispute.case_number}</span>
                          <StatusBadge status={dispute.dispute_status} />
                        </div>
                        <p className="font-semibold text-foreground text-sm leading-snug">{dispute.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dispute.bureau} · Opened {formatDate(dispute.opened_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-muted-foreground mt-0.5">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-5 py-4 space-y-5">
                        {/* Description */}
                        {dispute.description && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Case Summary</p>
                            <p className="text-sm text-foreground leading-relaxed">{dispute.description}</p>
                          </div>
                        )}

                        {/* Timeline */}
                        {disputeTimeline.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Case Timeline</p>
                            <div className="relative pl-5">
                              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                              <div className="space-y-4">
                                {disputeTimeline.map((event, idx) => (
                                  <div key={event.id} className="relative">
                                    <div className={`absolute -left-[17px] w-3 h-3 rounded-full border-2 border-card ${
                                      idx === disputeTimeline.length - 1 ? 'bg-primary' : 'bg-muted-foreground'
                                    }`} />
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-foreground">{event.event_title}</p>
                                        <span className="text-xs text-muted-foreground">{formatDate(event.event_date)}</span>
                                      </div>
                                      {event.event_description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{event.event_description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Upload for this dispute */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upload Documents</p>
                          <button
                            onClick={() => {
                              setUploadingFor(dispute.id);
                              setUploadError('');
                              setUploadSuccess('');
                              fileInputRef.current?.click();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 text-sm text-muted-foreground hover:text-primary transition-all"
                          >
                            <Paperclip size={14} />
                            Attach a document for this case
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="space-y-3">
            {updates.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Bell size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No updates yet.</p>
              </div>
            ) : (
              updates.map((update) => (
                <div
                  key={update.id}
                  className={`bg-card border rounded-xl p-5 transition-all ${
                    !update.is_read ? 'border-primary/30 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!update.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <p className="font-semibold text-foreground text-sm">{update.subject}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{update.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(update.created_at)}</p>
                    </div>
                    {!update.is_read && (
                      <button
                        onClick={() => markUpdateRead(update.id)}
                        className="shrink-0 text-xs text-primary hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Upload area */}
            <div className="bg-card border-2 border-dashed border-border rounded-xl p-6 text-center">
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Upload a document</p>
              <p className="text-xs text-muted-foreground mb-3">PDF, JPG, PNG or WEBP · Max 10 MB</p>
              <button
                onClick={() => {
                  setUploadingFor(null);
                  setUploadError('');
                  setUploadSuccess('');
                  fileInputRef.current?.click();
                }}
                className="btn-primary px-5 py-2 text-sm inline-flex items-center gap-2"
              >
                <Upload size={14} />
                Choose File
              </button>
            </div>

            {uploadError && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 flex items-start gap-2">
                <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{uploadError}</p>
              </div>
            )}
            {uploadSuccess && (
              <div className="rounded-lg bg-success/10 border border-success/20 px-4 py-3 flex items-start gap-2">
                <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />
                <p className="text-sm text-success">{uploadSuccess}</p>
              </div>
            )}

            {/* Document list */}
            {documents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const statusCfg = DOC_STATUS_CONFIG[doc.doc_status] || DOC_STATUS_CONFIG['uploaded'];
                  return (
                    <div key={doc.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(doc.uploaded_at)}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Live Chat Widget */}
      {account && (
        <ClientChatWidget
          clientAccountId={account.id}
          clientName={account.full_name}
        />
      )}
    </div>
  );
}
