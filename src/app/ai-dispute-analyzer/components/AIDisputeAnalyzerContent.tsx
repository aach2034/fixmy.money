'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Sparkles, Upload } from 'lucide-react';

type AnalysisItem = {
  type?: string;
  creditor_name?: string;
  account_number?: string | null;
  amount?: number | null;
  date_reported?: string | null;
  bureau?: string;
  dispute_reason?: string;
  priority?: 'high' | 'medium' | 'low';
  dispute_letter_template?: string;
};

type Analysis = {
  summary?: string;
  negative_items?: AnalysisItem[];
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The report could not be read.'));
    reader.readAsDataURL(file);
  });
}

export default function AIDisputeAnalyzerContent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = (nextFile?: File) => {
    setAnalysis(null);
    setError('');
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      setFile(null);
      setError('Upload a PDF, PNG, or JPG credit report.');
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setFile(null);
      setError('The report must be 10 MB or smaller.');
      return;
    }
    setFile(nextFile);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    try {
      const fileData = await readAsDataUrl(file);
      const response = await fetch('/api/credit-report/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData, fileName: file.name, fileType: file.type }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'The report could not be analyzed.');
      const result = payload.analysis as Analysis;
      if (!Array.isArray(result?.negative_items)) throw new Error('The analysis returned an invalid result. Please try again.');
      setAnalysis(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be analyzed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const ranked = [...(analysis?.negative_items || [])].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority || 'low'] - rank[b.priority || 'low'];
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">AI Dispute Analyzer</h1><span className="badge bg-ai/10 text-ai">AI Powered</span></div>
        <p className="text-sm text-muted-foreground mt-1">Results are generated only from the report you upload and must be reviewed before use.</p>
      </div>

      <div className="card p-8 text-center border-2 border-dashed"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}>
        {file ? <FileText className="mx-auto text-primary" size={32}/> : <Upload className="mx-auto text-ai" size={32}/>}
        <p className="font-bold mt-3">{file?.name || 'Drop your credit report here'}</p>
        <p className="text-sm text-muted-foreground mt-1">PDF, PNG, or JPG · Maximum 10 MB</p>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])}/>
        <div className="mt-4 flex justify-center gap-3">
          <button className="btn-secondary" onClick={() => inputRef.current?.click()}>{file ? 'Change report' : 'Browse files'}</button>
          {file && <button className="btn-primary flex items-center gap-2" disabled={analyzing} onClick={analyze}>{analyzing ? <Loader2 className="animate-spin" size={17}/> : <Sparkles size={17}/>} {analyzing ? 'Analyzing…' : 'Analyze report'}</button>}
        </div>
      </div>

      {error && <div className="card p-4 border border-danger/30 bg-danger/5 text-danger flex gap-2"><AlertTriangle size={18}/><p className="text-sm">{error}</p></div>}

      {analysis && <div className="space-y-4">
        <div className="card p-5"><h2 className="font-bold">AI summary</h2><p className="text-sm text-muted-foreground mt-2">{analysis.summary || 'Analysis completed. Review each extracted item against the original report.'}</p></div>
        {ranked.length === 0 ? <div className="card p-8 text-center"><CheckCircle2 className="mx-auto text-success"/><p className="font-bold mt-2">No negative items were extracted</p><p className="text-sm text-muted-foreground mt-1">Verify this against the original report before relying on the result.</p></div> : ranked.map((item, index) => <div className="card p-5" key={`${item.creditor_name || 'item'}-${index}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">Priority #{index + 1} · {(item.priority || 'low').toUpperCase()}</p><h3 className="font-bold mt-1">{item.creditor_name || item.type || 'Reported item'}</h3><p className="text-xs text-muted-foreground">{[item.bureau, item.account_number ? `Account ending ${item.account_number}` : '', item.amount != null ? `$${item.amount.toLocaleString()}` : ''].filter(Boolean).join(' · ')}</p></div><span className="badge bg-ai/10 text-ai">AI recommendation</span></div>
          <p className="text-sm mt-4"><strong>Why it is ranked here:</strong> {item.dispute_reason || 'No specific dispute basis was identified. Review manually.'}</p>
          {item.dispute_letter_template && <div className="mt-4 rounded-xl bg-muted/40 p-4"><p className="text-xs font-bold uppercase tracking-wide">Draft letter — review and edit</p><p className="text-sm whitespace-pre-wrap mt-2">{item.dispute_letter_template}</p></div>}
        </div>)}
      </div>}
    </div>
  );
}
