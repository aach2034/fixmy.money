'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Send, Loader2, Printer, ArrowLeft, RefreshCw, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { renderLetterForPrint } from '@/lib/disputes/letterPrint';

interface Letter {
  id: string;
  bureau: string;
  letterContent: string;
  itemsCount: number;
  status: string;
  mailedAt: string | null;
  responseDueDate: string | null;
  roundId: string | null;
  createdAt: string;
}

interface ClientLettersContentProps {
  clientId: string;
}

const BUREAU_COLORS: Record<string, string> = {
  Equifax: 'bureau-eq',
  Experian: 'bureau-ex',
  TransUnion: 'bureau-tu',
};

export default function ClientLettersContent({ clientId }: ClientLettersContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [certifiedMailingId, setCertifiedMailingId] = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: clientData } = await supabase.from('staff_clients').select('name').eq('id', clientId).single();
      setClientName(clientData?.name ?? 'Client');
      const { data } = await supabase.from('generated_dispute_letters').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      setLetters((data ?? []).map((row: any) => ({
        id: row.id,
        bureau: row.bureau,
        letterContent: row.letter_content,
        itemsCount: row.items_count,
        status: row.status,
        mailedAt: row.mailed_at,
        responseDueDate: row.response_due_date,
        roundId: row.round_id,
        createdAt: row.created_at,
      })));
    } catch {
      toast.error('Failed to load letters');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchLetters(); }, [fetchLetters]);

  const filtered = letters.filter(l => statusFilter === 'All' || l.status === statusFilter);

  const downloadLetter = (letter: Letter) => {
    const blob = new Blob([letter.letterContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-letter-${letter.bureau}-${new Date(letter.createdAt).toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printLetter = (letter: Letter) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.opener = null;
    renderLetterForPrint(win.document, letter.letterContent, `Dispute Letter ${letter.bureau}`);
    win.print();
  };

  const markMailed = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('generated_dispute_letters').update({ status: 'sent', mailed_at: new Date().toISOString() }).eq('id', id);
      setLetters(prev => prev.map(l => l.id === id ? { ...l, status: 'sent', mailedAt: new Date().toISOString() } : l));
      toast.success('Letter marked as mailed');
    } catch {
      toast.error('Failed to update');
    }
  };

  const mailCertified = async (letter: Letter) => {
    setCertifiedMailingId(letter.id);
    try {
      const quoteResponse = await fetch('/api/mailings/certified/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: letter.id, letterSource: 'generated_dispute_letters' }),
      });
      const quotePayload = await quoteResponse.json().catch(() => ({}));
      if (!quoteResponse.ok || !quotePayload?.quote?.available) {
        const setup = Array.isArray(quotePayload?.setupRequired ?? quotePayload?.quote?.setupRequired)
          ? (quotePayload.setupRequired ?? quotePayload.quote.setupRequired).join(', ')
          : '';
        toast.error(setup ? `USPS certified mail setup required: ${setup}` : quotePayload?.error ?? 'USPS certified mail is not available.');
        return;
      }

      const amount = typeof quotePayload.quote.amountCents === 'number'
        ? `$${(quotePayload.quote.amountCents / 100).toFixed(2)}`
        : 'the quoted USPS amount';
      if (!window.confirm(`Purchase USPS Certified Mail for ${letter.bureau}?\n\nCost: ${amount}`)) return;

      const purchaseResponse = await fetch('/api/mailings/certified/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: letter.id, letterSource: 'generated_dispute_letters' }),
      });
      const purchasePayload = await purchaseResponse.json().catch(() => ({}));
      if (!purchaseResponse.ok) throw new Error(purchasePayload?.error ?? 'Certified mailing could not be created.');

      const mailedAt = purchasePayload?.mailing?.mailed_at ?? new Date().toISOString();
      setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, status: 'sent', mailedAt } : l));
      toast.success(`Certified mailing created${purchasePayload?.mailing?.tracking_number ? `: ${purchasePayload.mailing.tracking_number}` : ''}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not create certified mailing.');
    } finally {
      setCertifiedMailingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push(`/clients/${clientId}/negative-items`)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft size={13} /> Back to Negative Items
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Dispute Letters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clientName} · {letters.length} letters</p>
        </div>
        <button onClick={fetchLetters} className="btn-secondary flex items-center gap-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {['All', 'generated', 'sent', 'waiting_for_response', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
            {s === 'All' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No letters yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a dispute round from negative items to generate letters.</p>
          <button onClick={() => router.push(`/clients/${clientId}/negative-items`)} className="btn-primary mt-4">Go to Negative Items</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(letter => (
            <div key={letter.id} className="card">
              <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className={`badge ${BUREAU_COLORS[letter.bureau] ?? 'bg-muted text-muted-foreground border-border'}`}>{letter.bureau}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{letter.itemsCount} item{letter.itemsCount !== 1 ? 's' : ''} disputed</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(letter.createdAt).toLocaleDateString()}
                      {letter.mailedAt && ` · Mailed ${new Date(letter.mailedAt).toLocaleDateString()}`}
                      {letter.responseDueDate && ` · Due ${new Date(letter.responseDueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${letter.status === 'sent' ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                    {letter.status === 'sent' ? 'Sent/Mailed' : letter.status === 'generated' ? 'Generated draft' : letter.status.replace('_', ' ')}
                  </span>
                  <button onClick={() => setPreviewId(previewId === letter.id ? null : letter.id)} className="btn-secondary text-xs flex items-center gap-1"><FileText size={12} /> Preview</button>
                  <button onClick={() => downloadLetter(letter)} className="btn-secondary text-xs flex items-center gap-1"><Download size={12} /> Download</button>
                  <button onClick={() => printLetter(letter)} className="btn-secondary text-xs flex items-center gap-1"><Printer size={12} /> Print</button>
                  {letter.status !== 'sent' && (
                    <button onClick={() => mailCertified(letter)} disabled={certifiedMailingId === letter.id} className="btn-secondary text-xs flex items-center gap-1">
                      {certifiedMailingId === letter.id ? <Loader2 size={12} className="animate-spin" /> : <MailCheck size={12} />}
                      Mail Certified
                    </button>
                  )}
                  {letter.status !== 'sent' && (
                    <button onClick={() => markMailed(letter.id)} className="btn-primary text-xs flex items-center gap-1"><Send size={12} /> Mark Mailed</button>
                  )}
                </div>
              </div>
              {previewId === letter.id && (
                <div className="border-t border-border p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap bg-muted/30 rounded-xl p-4 max-h-96 overflow-y-auto">{letter.letterContent}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
