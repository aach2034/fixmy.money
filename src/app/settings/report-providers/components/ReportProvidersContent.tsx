'use client';
import React, { useState, useEffect } from 'react';
import { ExternalLink, Star, Eye, EyeOff, Save, Loader2, AlertTriangle, CheckCircle2, Link2, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PROVIDERS, DEFAULT_DISCLOSURE } from '@/lib/affiliates/reportProviders';
import { toast } from 'sonner';

interface ProviderRow {
  key: string;
  name: string;
  description: string;
  affiliateUrl: string;
  isVisible: boolean;
  isPreferred: boolean;
  displayOrder: number;
}

export default function ReportProvidersContent() {
  const supabase = createClient();
  const [providers, setProviders] = useState<ProviderRow[]>(DEFAULT_PROVIDERS.map(p => ({ ...p })));
  const [disclosure, setDisclosure] = useState(DEFAULT_DISCLOSURE);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ws } = await supabase
        .from('workspaces')
        .select('id, affiliate_disclosure')
        .eq('owner_id', user.id)
        .single();

      if (!ws) return;
      setWorkspaceId(ws.id);
      if (ws.affiliate_disclosure) setDisclosure(ws.affiliate_disclosure);

      const { data: rows } = await supabase
        .from('report_provider_settings')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('display_order');

      if (rows && rows.length > 0) {
        const merged = DEFAULT_PROVIDERS.map(def => {
          const saved = rows.find((r: any) => r.provider_key === def.key);
          if (saved) {
            return {
              key: saved.provider_key,
              name: saved.provider_name,
              description: def.description,
              affiliateUrl: saved.affiliate_url,
              isVisible: saved.is_visible,
              isPreferred: saved.is_preferred,
              displayOrder: saved.display_order,
            };
          }
          return { ...def };
        });
        setProviders(merged);
      }
    } catch (err) {
      console.error('[ReportProviders] load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function updateProvider(key: string, field: keyof ProviderRow, value: string | boolean) {
    setProviders(prev => prev.map(p => {
      if (p.key !== key) return p;
      if (field === 'isPreferred' && value === true) {
        // Only one preferred at a time
        return { ...p, [field]: value };
      }
      return { ...p, [field]: value };
    }));
    if (field === 'isPreferred' && value === true) {
      setProviders(prev => prev.map(p => ({
        ...p,
        isPreferred: p.key === key ? true : false,
      })));
    }
  }

  async function handleSave() {
    if (!workspaceId) {
      toast.error('No workspace found. Please complete company setup first.');
      return;
    }
    setSaving(true);
    try {
      // Upsert all providers
      for (const p of providers) {
        await supabase.from('report_provider_settings').upsert({
          workspace_id: workspaceId,
          provider_key: p.key,
          provider_name: p.name,
          affiliate_url: p.affiliateUrl,
          is_visible: p.isVisible,
          is_preferred: p.isPreferred,
          display_order: p.displayOrder,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,provider_key' });
      }

      // Save disclosure text
      await supabase.from('workspaces').update({
        affiliate_disclosure: disclosure,
      }).eq('id', workspaceId);

      toast.success('Report provider settings saved!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="app-page state-panel min-h-[300px]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="app-page page-stack max-w-screen-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Provider Settings</h1>
          <p className="page-description">
            Manage affiliate links for credit report providers shown to clients
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary shrink-0"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Affiliate Link Management</p>
          <p>These links appear in client onboarding, the client portal, and the Credit Report Import Center. Affiliate disclosures are automatically shown wherever links appear. Links are only shown after company setup is complete.</p>
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Credit Report Providers</h2>
        {providers.map(provider => (
          <div key={provider.key} className={`card p-5 space-y-4 ${!provider.isVisible ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 size={18} className="text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
                    {provider.isPreferred && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        Preferred
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => updateProvider(provider.key, 'isPreferred', true)}
                  title="Set as preferred provider"
                  className={`p-1.5 rounded-lg transition-colors ${provider.isPreferred ? 'bg-amber-100 text-amber-600' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <Star size={15} className={provider.isPreferred ? 'fill-amber-500' : ''} />
                </button>
                <button
                  onClick={() => updateProvider(provider.key, 'isVisible', !provider.isVisible)}
                  title={provider.isVisible ? 'Hide provider' : 'Show provider'}
                  className={`p-1.5 rounded-lg transition-colors ${provider.isVisible ? 'bg-success/10 text-success' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  {provider.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Affiliate URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={provider.affiliateUrl}
                  onChange={e => updateProvider(provider.key, 'affiliateUrl', e.target.value)}
                  placeholder="https://provider.com/?ref=yourcode"
                  className="input-field flex-1 text-sm font-mono"
                />
                {provider.affiliateUrl && (
                  <a
                    href={provider.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Test link"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
              {!provider.affiliateUrl && provider.isVisible && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle size={11} />
                  No affiliate URL set — provider will show a disabled button
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Disclosure text */}
      <div className="card p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Affiliate Disclosure Text</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            This disclosure appears wherever affiliate links are shown to clients
          </p>
        </div>
        <textarea
          value={disclosure}
          onChange={e => setDisclosure(e.target.value)}
          rows={3}
          className="input-field w-full text-sm resize-none"
        />
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            FTC guidelines require clear and conspicuous disclosure of material connections. Do not remove or substantially alter this disclosure.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="card p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Preview — Visible Providers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {providers.filter(p => p.isVisible && p.affiliateUrl).map(p => (
            <div key={p.key} className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                {p.isPreferred && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Recommended</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <a
                href={p.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink size={11} />
                Get {p.name} Report
              </a>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <CheckCircle2 size={13} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 italic">{disclosure}</p>
        </div>
      </div>
    </div>
  );
}
