'use client';
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendTransactionalEmail } from '@/lib/email/emailService';

interface AddClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  plan: string;
  assignedStaff: string;
  notes: string;
  bureausEQ: boolean;
  bureausEX: boolean;
  bureausTU: boolean;
}

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  type: string;
  dataUrl: string;
}

interface AnalysisResult {
  total_negative_accounts: number;
  total_collections: number;
  total_charge_offs: number;
  total_late_payments: number;
  improvement_opportunities: number;
  summary: string;
}

export default function AddClientForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<AddClientFormData>({
    defaultValues: {
      plan: 'Growth',
      assignedStaff: '',
      bureausEQ: true,
      bureausEX: true,
      bureausTU: true,
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFile = (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, or WEBP files are supported');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({
        file,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        dataUrl: e.target?.result as string,
      });
      setAnalysisStatus('idle');
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const analyzeReport = async () => {
    if (!uploadedFile) return;
    setAnalysisStatus('analyzing');
    try {
      const res = await fetch('/api/credit-report/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: uploadedFile.dataUrl,
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysisResult(data.analysis);
      setAnalysisStatus('done');
      toast.success('Credit report analyzed successfully');
    } catch (err: any) {
      setAnalysisStatus('error');
      toast.error(err.message || 'Failed to analyze report');
    }
  };

  const onSubmit = async (data: AddClientFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get workspace_id for this user
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      const bureaus: string[] = [];
      if (data.bureausEQ) bureaus.push('EQ');
      if (data.bureausEX) bureaus.push('EX');
      if (data.bureausTU) bureaus.push('TU');

      // Insert client record
      const { data: newClient, error: clientError } = await supabase
        .from('staff_clients')
        .insert({
          owner_id: user.id,
          workspace_id: workspace?.id ?? null,
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          phone: data.phone,
          plan: data.plan,
          assigned_staff: data.assignedStaff,
          bureaus,
          case_stage: 'lead',
          subscription_status: 'pending',
          last_activity: 'Just added',
          report_analyzed: false,
        })
        .select('id')
        .single();

      if (clientError) throw clientError;

      // If a credit report was uploaded, store it and optionally save analysis
      if (uploadedFile && newClient?.id) {
        const { data: uploadRecord, error: uploadError } = await supabase
          .from('credit_report_uploads')
          .insert({
            user_id: user.id,
            client_id: newClient.id,
            workspace_id: workspace?.id ?? null,
            file_name: uploadedFile.name,
            file_type: uploadedFile.type,
            file_size: uploadedFile.file.size,
            upload_status: analysisStatus === 'done' ? 'completed' : 'pending',
          })
          .select('id')
          .single();

        if (!uploadError && uploadRecord?.id) {
          // Link upload to client
          await supabase
            .from('staff_clients')
            .update({
              report_upload_id: uploadRecord.id,
              report_analyzed: analysisStatus === 'done',
            })
            .eq('id', newClient.id);

          // If analysis completed, save to credit_report_analyses
          if (analysisStatus === 'done' && analysisResult) {
            const { data: analysisRecord } = await supabase
              .from('credit_report_analyses')
              .insert({
                upload_id: uploadRecord.id,
                user_id: user.id,
                total_negative_accounts: analysisResult.total_negative_accounts,
                total_collections: analysisResult.total_collections,
                total_charge_offs: analysisResult.total_charge_offs,
                total_late_payments: analysisResult.total_late_payments,
                improvement_opportunities: analysisResult.improvement_opportunities,
                raw_analysis: analysisResult,
                negative_items: (analysisResult as any).negative_items ?? [],
              })
              .select('id')
              .single();

            // Auto-create disputes from parsed negative items
            const negativeItems: any[] = (analysisResult as any).negative_items ?? [];
            if (negativeItems.length > 0 && newClient?.id) {
              // Determine which bureaus to dispute against
              const clientBureauMap: Record<string, string> = {
                EQ: 'Equifax',
                EX: 'Experian',
                TU: 'TransUnion',
              };
              const selectedBureauNames = bureaus.map(b => clientBureauMap[b] ?? b);

              // Build dispute records — one per negative item per bureau
              const disputeRows: any[] = [];
              const responseDueDate = new Date();
              responseDueDate.setDate(responseDueDate.getDate() + 30);
              const dueDateStr = responseDueDate.toISOString().split('T')[0];

              for (const item of negativeItems) {
                // Determine which bureaus this item applies to
                const itemBureau = item.bureau ?? 'Unknown';
                const targetBureaus =
                  itemBureau !== 'Unknown' && selectedBureauNames.includes(itemBureau)
                    ? [itemBureau]
                    : selectedBureauNames.length > 0
                    ? selectedBureauNames
                    : ['Equifax', 'Experian', 'TransUnion'];

                for (const bureau of targetBureaus) {
                  disputeRows.push({
                    owner_id: user.id,
                    client_id: newClient.id,
                    workspace_id: workspace?.id ?? null,
                    analysis_id: analysisRecord?.id ?? null,
                    creditor_name: item.creditor_name ?? 'Unknown Creditor',
                    account_number: item.account_number ?? '',
                    negative_item_type: item.type ?? 'other',
                    bureau,
                    dispute_reason: item.dispute_reason ?? 'Inaccurate information under FCRA Section 611',
                    dispute_letter_template: item.dispute_letter_template ?? 'FCRA Section 611',
                    amount: item.amount ?? null,
                    date_reported: item.date_reported ?? null,
                    priority: item.priority ?? 'medium',
                    dispute_status: 'pending',
                    response_due_date: dueDateStr,
                    days_remaining: 30,
                    auto_generated: true,
                  });
                }
              }

              // Insert client_disputes
              if (disputeRows.length > 0) {
                await supabase.from('client_disputes').insert(disputeRows);
              }

              // Update client active_disputes count
              await supabase
                .from('staff_clients')
                .update({ active_disputes: disputeRows.length, case_stage: 'active' })
                .eq('id', newClient.id);

              toast.success(
                `${disputeRows.length} dispute${disputeRows.length !== 1 ? 's' : ''} auto-created across ${selectedBureauNames.length} bureau${selectedBureauNames.length !== 1 ? 's' : ''} — ready for letter generation`
              );
            }
          }
        }
      }

      toast.success(`${data.firstName} ${data.lastName} enrolled successfully`);

      // Send welcome email (non-blocking)
      if (data.email) {
        const { data: sessionData } = await supabase.auth.getSession();
        void sendTransactionalEmail({
          type: 'client_notification',
          to: data.email,
          clientName: `${data.firstName} ${data.lastName}`,
          clientEmail: data.email,
          assignedStaff: data.assignedStaff,
          clientPlan: data.plan,
        }, sessionData.session?.access_token);
      }

      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">First name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Darnell"
            {...register('firstName', { required: 'Required' })}
          />
          {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="label-text">Last name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Washington"
            {...register('lastName', { required: 'Required' })}
          />
          {errors.lastName && <p className="error-text">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="label-text">Email address</label>
        <input
          type="email"
          className="input-field"
          placeholder="client@email.com"
          {...register('email', { required: 'Required' })}
        />
        {errors.email && <p className="error-text">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="label-text">Phone number</label>
        <input
          type="tel"
          className="input-field"
          placeholder="Client phone number"
          {...register('phone', { required: 'Required' })}
        />
        {errors.phone && <p className="error-text">{errors.phone.message}</p>}
      </div>

      {/* Plan + Staff */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Subscription plan</label>
          <select className="input-field" {...register('plan')}>
            <option>Starter</option>
            <option>Growth</option>
            <option>Agency</option>
          </select>
        </div>
        <div>
          <label className="label-text">Assigned staff</label>
          <input className="input-field" placeholder="Staff member (optional)" {...register('assignedStaff')} />
        </div>
      </div>

      {/* Bureaus */}
      <div>
        <label className="label-text">Credit bureaus to dispute</label>
        <p className="helper-text">Select all bureaus for this client's dispute strategy</p>
        <div className="flex gap-4 mt-2">
          {[
            { key: 'bureausEQ', label: 'Equifax' },
            { key: 'bureausEX', label: 'Experian' },
            { key: 'bureausTU', label: 'TransUnion' },
          ].map((b) => (
            <label key={`bureau-check-${b.key}`} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-input accent-primary"
                {...register(b.key as keyof AddClientFormData)}
              />
              <span className="text-sm font-medium text-foreground">{b.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Credit Report Upload */}
      <div>
        <label className="label-text">Credit report (optional)</label>
        <p className="helper-text">Upload PDF or image — AI will parse negative items automatically</p>

        {!uploadedFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={18} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Drop credit report here</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 20 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {/* File card */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">{uploadedFile.size}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFile(null);
                  setAnalysisStatus('idle');
                  setAnalysisResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Analyze button / status */}
            {analysisStatus === 'idle' && (
              <button
                type="button"
                onClick={analyzeReport}
                className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <ScanIcon size={15} />
                Analyze Report with AI
              </button>
            )}

            {analysisStatus === 'analyzing' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Loader2 size={15} className="text-blue-600 animate-spin shrink-0" />
                <p className="text-sm text-blue-700 font-medium">Analyzing credit report…</p>
              </div>
            )}

            {analysisStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">Analysis failed</p>
                  <button
                    type="button"
                    onClick={analyzeReport}
                    className="text-xs text-red-600 underline mt-0.5"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {analysisStatus === 'done' && analysisResult && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">Analysis complete</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Negative Items', value: analysisResult.total_negative_accounts },
                    { label: 'Collections', value: analysisResult.total_collections },
                    { label: 'Opportunities', value: analysisResult.improvement_opportunities },
                  ].map((s) => (
                    <div key={`analysis-stat-${s.label}`} className="bg-white rounded-lg p-2 text-center border border-emerald-100">
                      <p className="text-lg font-bold text-foreground tabular-nums">{s.value}</p>
                      <p className="text-2xs text-muted-foreground leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
                {analysisResult.summary && (
                  <p className="text-xs text-emerald-700 leading-relaxed">{analysisResult.summary}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="label-text">Case notes (optional)</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Initial consultation notes, credit issues, goals..."
          {...register('notes')}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2 min-w-[130px] justify-center"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            'Enroll Client'
          )}
        </button>
      </div>
    </form>
  );
}

function ScanIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}
