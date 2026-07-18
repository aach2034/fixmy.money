'use client';
import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';

interface DisputeItem {
  id: string;
  creditor: string;
  accountType: string;
  balance: string;
  status: string;
  likelihood: 'high' | 'medium' | 'low';
  reason: string;
  strategy: string;
}

const sampleAnalysis: DisputeItem[] = [
  {
    id: 'di-001', creditor: 'Capital One', accountType: 'Credit Card', balance: '$2,340', status: 'Late Payment × 3',
    likelihood: 'high', reason: 'Creditor failed to verify within 30-day FCRA window in prior dispute cycle.',
    strategy: 'Send Method of Verification letter to all 3 bureaus immediately.',
  },
  {
    id: 'di-002', creditor: 'Midland Credit Mgmt', accountType: 'Collection', balance: '$890', status: 'Collection Account',
    likelihood: 'high', reason: 'Debt buyer — original creditor may not have proper documentation to validate.',
    strategy: 'Debt validation letter first, then dispute if unverified within 30 days.',
  },
  {
    id: 'di-003', creditor: 'Synchrony Bank', accountType: 'Retail Card', balance: '$1,200', status: 'Charge-off',
    likelihood: 'medium', reason: 'Account shows inconsistent reporting dates across bureaus.',
    strategy: 'Dispute date of first delinquency discrepancy with Equifax and TransUnion.',
  },
  {
    id: 'di-004', creditor: 'Student Loan Servicer', accountType: 'Student Loan', balance: '$18,400', status: 'Current',
    likelihood: 'low', reason: 'Federal student loans are well-documented and rarely deleted.',
    strategy: 'Focus on payment history accuracy rather than deletion.',
  },
  {
    id: 'di-005', creditor: 'Verizon Wireless', accountType: 'Utility/Telecom', balance: '$340', status: 'Collection',
    likelihood: 'high', reason: 'Telecom collections frequently lack proper documentation for verification.',
    strategy: 'Goodwill deletion request + dispute if no response in 30 days.',
  },
];

const likelihoodConfig = {
  high: { label: 'Likely Deletion', bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', icon: CheckCircle2 },
  medium: { label: 'Possible Deletion', bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', icon: AlertTriangle },
  low: { label: 'Low Probability', bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20', icon: XCircle },
};

export default function AIDisputeAnalyzerContent() {
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [fileName, setFileName] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { response, isLoading, sendMessage } = useChat('openai', 'gpt-4o', false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploaded(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploaded(true);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 2200);
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    sendMessage([
      { role: 'system', content: 'You are a credit repair expert AI. Analyze credit report disputes and provide actionable advice. Be concise and specific.' },
      { role: 'user', content: aiQuestion },
    ]);
    setAiQuestion('');
  };

  const highCount = sampleAnalysis.filter(i => i.likelihood === 'high').length;
  const medCount = sampleAnalysis.filter(i => i.likelihood === 'medium').length;
  const lowCount = sampleAnalysis.filter(i => i.likelihood === 'low').length;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">AI Dispute Analyzer</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ai/10 text-ai">AI Powered</span>
          </div>
          <p className="text-sm text-muted-foreground">Upload a credit report to get AI-powered dispute recommendations</p>
        </div>
      </div>

      {!analyzed ? (
        /* Upload Area */
        <div className="max-w-2xl mx-auto">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              uploaded ? 'border-primary bg-primary/5' : 'border-border hover:border-ai/50 hover:bg-ai/5'
            }`}
          >
            {uploaded ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <FileText size={28} className="text-primary" />
                </div>
                <p className="text-base font-bold text-foreground">{fileName}</p>
                <p className="text-sm text-muted-foreground">Report ready for analysis</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-ai/10 flex items-center justify-center mx-auto">
                  <Upload size={28} className="text-ai" />
                </div>
                <p className="text-base font-bold text-foreground">Drop your credit report here</p>
                <p className="text-sm text-muted-foreground">PDF, PNG, or JPG · Max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-4 btn-secondary text-sm"
            >
              {uploaded ? 'Change File' : 'Browse Files'}
            </button>
          </div>

          {uploaded && (
            <div className="mt-4 text-center">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="btn-primary px-8 py-3 text-base flex items-center gap-2 mx-auto"
              >
                {analyzing ? (
                  <><Loader2 size={18} className="animate-spin" /> Analyzing Report...</>
                ) : (
                  <><Sparkles size={18} /> Analyze with AI</>
                )}
              </button>
              {analyzing && (
                <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                  AI is scanning for dispute opportunities...
                </p>
              )}
            </div>
          )}

          {/* Demo Mode */}
          {!uploaded && (
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground mb-2">Want to see a demo?</p>
              <button
                onClick={() => { setFileName('sample_credit_report.pdf'); setUploaded(true); }}
                className="text-xs text-ai hover:underline font-semibold"
              >
                Load sample report →
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Analysis Results */
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { count: highCount, label: 'Likely Deletions', level: 'high' as const },
              { count: medCount, label: 'Possible Deletions', level: 'medium' as const },
              { count: lowCount, label: 'Low Probability', level: 'low' as const },
            ].map((s) => {
              const cfg = likelihoodConfig[s.level];
              const SIcon = cfg.icon;
              return (
                <div key={s.level} className={`card p-5 border ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-center gap-3">
                    <SIcon size={22} className={cfg.text} />
                    <div>
                      <p className={`text-2xl font-black ${cfg.text}`}>{s.count}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dispute Items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Dispute Analysis — {sampleAnalysis.length} items found</h3>
              <span className="text-xs text-muted-foreground">{fileName}</span>
            </div>
            <div className="divide-y divide-border">
              {sampleAnalysis.map((item) => {
                const cfg = likelihoodConfig[item.likelihood];
                const CfgIcon = cfg.icon;
                const isExpanded = expandedItem === item.id;
                return (
                  <div key={item.id}>
                    <button
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    >
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <CfgIcon size={15} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">{item.creditor}</span>
                          <span className="text-xs text-muted-foreground">{item.accountType}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{item.balance}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.status}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}>{cfg.label}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 fade-in">
                        <div className="ml-12 space-y-3">
                          <div className={`p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                            <p className="text-xs font-semibold text-foreground mb-1">Why this may be deleted:</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-ai/5 border border-ai/20">
                            <p className="text-xs font-semibold text-ai mb-1 flex items-center gap-1"><Sparkles size={11} /> Recommended Strategy:</p>
                            <p className="text-xs text-foreground">{item.strategy}</p>
                          </div>
                          <button className="btn-primary text-xs py-1.5 px-4">Generate Dispute Letter</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Chat */}
          <div className="card p-5 border-ai/20 bg-gradient-to-br from-ai/5 to-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ai/10 flex items-center justify-center">
                <Bot size={16} className="text-ai" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Ask AI About This Report</p>
                <p className="text-xs text-muted-foreground">Get specific advice on any item</p>
              </div>
            </div>
            {response && (
              <div className="mb-3 p-3 rounded-xl bg-card border border-border text-sm text-foreground leading-relaxed">
                {response}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                placeholder="e.g. Should I dispute the Capital One account first?"
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={handleAskAI}
                disabled={isLoading || !aiQuestion.trim()}
                className="btn-primary flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Ask
              </button>
            </div>
          </div>

          <button onClick={() => { setAnalyzed(false); setUploaded(false); setFileName(''); }} className="btn-secondary text-sm">
            Analyze Another Report
          </button>
        </div>
      )}
    </div>
  );
}
