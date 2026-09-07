'use client';
import React, { useState, useRef } from 'react';
import { Upload, Loader2, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { parseCreditReport, type ParsedCreditReport, type SupportedProvider } from '@/lib/creditReport/parser';
import { toast } from 'sonner';

const PROVIDERS: { value: SupportedProvider; label: string }[] = [
  { value: 'unknown', label: 'Auto-detect' },
  { value: 'smartcredit', label: 'SmartCredit' },
  { value: 'myscoreiq', label: 'MyScoreIQ' },
  { value: 'identityiq', label: 'IdentityIQ' },
  { value: 'myfreescorenow', label: 'MyFreeScoreNow' },
  { value: 'privacyguard', label: 'PrivacyGuard' },
  { value: 'experian', label: 'Experian PDF' },
  { value: 'annualcreditreport', label: 'AnnualCreditReport.com' },
  { value: 'creditkarma', label: 'Credit Karma' },
];

export default function ParserDebuggerContent() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('unknown');
  const [result, setResult] = useState<ParsedCreditReport | null>(null);
  const [parsing, setParsing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (s: string) => {
    setExpandedSections(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const text = await file.text();
      setRawText(text);
      const parsed = parseCreditReport(text, selectedProvider === 'unknown' ? undefined : selectedProvider);
      setResult(parsed);
      toast.success(`Parsed with ${parsed.overallConfidence}% confidence`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Parse failed');
    } finally {
      setParsing(false);
    }
  };

  const handlePasteText = () => {
    if (!rawText.trim()) { toast.error('Paste text first'); return; }
    setParsing(true);
    try {
      const parsed = parseCreditReport(rawText, selectedProvider === 'unknown' ? undefined : selectedProvider);
      setResult(parsed);
      toast.success(`Parsed with ${parsed.overallConfidence}% confidence`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Parse failed');
    } finally {
      setParsing(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'personal', label: 'Personal' },
    { id: 'accounts', label: `Accounts (${result?.accounts.length ?? 0})` },
    { id: 'negative', label: `Negative (${result?.negativeAccounts.length ?? 0})` },
    { id: 'inquiries', label: `Inquiries (${result?.inquiries.length ?? 0})` },
    { id: 'public', label: `Public Records (${result?.publicRecords.length ?? 0})` },
    { id: 'warnings', label: `Warnings (${result?.warnings.length ?? 0})` },
    { id: 'json', label: 'JSON Output' },
    { id: 'raw', label: 'Raw Text' },
  ];

  return (
    <div className="app-page page-stack max-w-screen-xl">
      <div className="page-header"><div>
        <h1 className="page-title">Parser Debugger</h1>
        <p className="page-description">Admin tool — test credit report parsing, inspect extracted data, and debug parser output</p>
      </div>
      </div>

      {/* Input */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Provider</label>
            <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value as SupportedProvider)} className="input-field min-w-40">
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex-1" />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary flex items-center gap-1.5">
            <Upload size={14} /> Upload File
          </button>
          <button onClick={handlePasteText} disabled={parsing || !rawText.trim()} className="btn-primary flex items-center gap-1.5">
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Parse Text
          </button>
          <input ref={fileRef} type="file" className="hidden" accept=".txt,.pdf,.html,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Paste credit report text (or upload file above)</label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={8}
            className="w-full text-xs font-mono border border-border rounded-xl px-3 py-2 bg-card text-foreground resize-y"
            placeholder="Paste credit report text here…"
          />
        </div>
      </div>

      {result && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted border border-border'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Provider', value: result.provider, sub: `${result.providerConfidence}% confidence` },
                  { label: 'Overall Confidence', value: `${result.overallConfidence}%`, sub: result.parserVersion },
                  { label: 'Accounts', value: result.accounts.length, sub: `${result.negativeAccounts.length} negative` },
                  { label: 'Warnings', value: result.warnings.length, sub: result.warnings.filter(w => w.severity === 'error').length + ' errors' },
                ].map(s => (
                  <div key={s.label} className="card p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Sections Parsed</h3>
                <div className="flex flex-wrap gap-2">
                  {result.sectionsParsed.map(s => (
                    <span key={s} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                      <CheckCircle2 size={11} /> {s}
                    </span>
                  ))}
                  {result.sectionsMissed.map(s => (
                    <span key={s} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
                      <AlertTriangle size={11} /> {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Confidence Bar</h3>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${result.overallConfidence >= 70 ? 'bg-success' : result.overallConfidence >= 40 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${result.overallConfidence}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{result.overallConfidence}% — {result.sectionsParsed.length}/{result.sectionsParsed.length + result.sectionsMissed.length} sections detected</p>
              </div>
            </div>
          )}

          {/* Personal */}
          {activeTab === 'personal' && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium">{result.personalInfo.name || '—'}</p></div>
                <div><p className="text-muted-foreground">SSN</p><p className="font-mono">{result.personalInfo.ssn || '—'}</p></div>
                <div><p className="text-muted-foreground">DOB</p><p>{result.personalInfo.dob || '—'}</p></div>
                <div><p className="text-muted-foreground">Current Address</p><p>{result.personalInfo.currentAddress?.raw || '—'}</p></div>
                <div><p className="text-muted-foreground">Employers</p><p>{result.personalInfo.employers.join(', ') || '—'}</p></div>
                <div><p className="text-muted-foreground">Name Variations</p><p>{result.personalInfo.nameVariations.join(', ') || '—'}</p></div>
              </div>
              {result.scores.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Credit Scores</p>
                  <div className="flex gap-3">
                    {result.scores.map((s, i) => (
                      <div key={i} className="px-3 py-2 bg-muted rounded-lg text-center">
                        <p className="text-lg font-bold">{s.score}</p>
                        <p className="text-xs text-muted-foreground">{s.bureau}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accounts */}
          {activeTab === 'accounts' && (
            <div className="space-y-2">
              {result.accounts.length === 0 ? <p className="text-sm text-muted-foreground card p-4">No accounts detected</p> : result.accounts.map((acc, i) => (
                <div key={i} className={`card p-4 text-xs ${acc.isNegative ? 'border-danger/30' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{acc.creditorName}</p>
                      <p className="text-muted-foreground">{acc.accountType} · {acc.bureau} · {acc.status}</p>
                      {acc.isNegative && <p className="text-danger mt-0.5">{acc.negativeReason}</p>}
                    </div>
                    <div className="text-right">
                      {acc.balance !== null && <p className="font-medium">${acc.balance.toLocaleString()}</p>}
                      <p className="text-muted-foreground">{acc.parserConfidence}% confidence</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Negative */}
          {activeTab === 'negative' && (
            <div className="space-y-2">
              {result.negativeAccounts.length === 0 ? <p className="text-sm text-muted-foreground card p-4">No negative accounts detected</p> : result.negativeAccounts.map((acc, i) => (
                <div key={i} className="card p-4 border-danger/30 bg-danger/5 text-xs">
                  <p className="font-semibold text-sm text-foreground">{acc.creditorName}</p>
                  <p className="text-muted-foreground">{acc.accountType} · {acc.bureau}</p>
                  <p className="text-danger">{acc.negativeReason}</p>
                  {acc.balance !== null && <p>Balance: ${acc.balance.toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Inquiries */}
          {activeTab === 'inquiries' && (
            <div className="card p-5 space-y-2">
              {result.inquiries.length === 0 ? <p className="text-sm text-muted-foreground">No inquiries detected</p> : result.inquiries.map((inq, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border text-xs">
                  <div><p className="font-medium text-foreground">{inq.creditor}</p><p className="text-muted-foreground">{inq.date} · {inq.bureau}</p></div>
                  <span className={`px-2 py-0.5 rounded-full border text-xs ${inq.type === 'hard' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-muted text-muted-foreground border-border'}`}>{inq.type}</span>
                </div>
              ))}
            </div>
          )}

          {/* Public Records */}
          {activeTab === 'public' && (
            <div className="card p-5 space-y-2">
              {result.publicRecords.length === 0 ? <p className="text-sm text-muted-foreground">No public records detected</p> : result.publicRecords.map((pr, i) => (
                <div key={i} className="py-2 border-b border-border text-xs">
                  <p className="font-medium text-foreground capitalize">{pr.type}</p>
                  <p className="text-muted-foreground">{pr.dateFiled} · {pr.bureau} · {pr.status}</p>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {activeTab === 'warnings' && (
            <div className="space-y-2">
              {result.warnings.length === 0 ? (
                <div className="card p-4 flex items-center gap-2 text-success text-sm"><CheckCircle2 size={16} /> No warnings</div>
              ) : result.warnings.map((w, i) => (
                <div key={i} className={`card p-4 text-sm ${w.severity === 'error' ? 'border-danger/30 bg-danger/5' : w.severity === 'warning' ? 'border-warning/30 bg-warning/5' : 'border-primary/20 bg-primary/5'}`}>
                  <p className="font-medium">[{w.severity.toUpperCase()}] {w.section}</p>
                  <p className="text-xs mt-0.5 opacity-80">{w.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* JSON */}
          {activeTab === 'json' && (
            <div className="card p-4">
              <pre className="text-xs font-mono text-foreground whitespace-pre-wrap bg-muted/30 rounded-xl p-4 max-h-[600px] overflow-y-auto">
                {JSON.stringify({ ...result, rawText: '[REDACTED]' }, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw Text */}
          {activeTab === 'raw' && (
            <div className="card p-4">
              <pre className="text-xs font-mono text-foreground whitespace-pre-wrap bg-muted/30 rounded-xl p-4 max-h-[600px] overflow-y-auto">
                {result.rawText || '(no raw text)'}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
