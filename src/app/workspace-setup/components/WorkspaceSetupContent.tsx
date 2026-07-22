'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Check, Pencil, Trash2, ChevronRight } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChatbotWidget from '@/components/ChatbotWidget';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export default function WorkspaceSetupContent() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.log('Fetch workspaces error:', fetchError.message);
        setWorkspaces([]);
      } else {
        setWorkspaces(data || []);
        if (data && data.length > 0 && !activeWorkspaceId) {
          setActiveWorkspaceId(data[0].id);
        }
        if (!data || data.length === 0) {
          setShowCreateForm(true);
        }
      }
    } catch (err: any) {
      console.log('Error fetching workspaces:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Workspace name is required');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('workspaces')
        .insert({ name: trimmed, owner_id: user!.id })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
      } else if (data) {
        setWorkspaces((prev) => [...prev, data]);
        setActiveWorkspaceId(data.id);
        setNewName('');
        setShowCreateForm(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleRenameWorkspace = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ name: trimmed })
        .eq('id', id)
        .eq('owner_id', user!.id);

      if (!updateError) {
        setWorkspaces((prev) =>
          prev.map((ws) => (ws.id === id ? { ...ws, name: trimmed } : ws))
        );
        setEditingId(null);
        setEditingName('');
      }
    } catch (err: any) {
      console.log('Rename error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (workspaces.length <= 1) return;
    try {
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id)
        .eq('owner_id', user!.id);

      if (!deleteError) {
        const remaining = workspaces.filter((ws) => ws.id !== id);
        setWorkspaces(remaining);
        if (activeWorkspaceId === id) {
          setActiveWorkspaceId(remaining[0]?.id || null);
        }
      }
    } catch (err: any) {
      console.log('Delete error:', err.message);
    }
  };

  const handleContinue = () => {
    if (activeWorkspaceId) {
      router.push('/dashboard');
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-primary flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/20" />
          <div className="absolute bottom-32 right-8 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/15" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <AppLogo size={40} />
            <span className="text-white font-bold text-xl tracking-tight">Fix My Money</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your workspace, your rules
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            Create separate workspaces for each credit repair business you operate. Switch between them instantly — clients, disputes, and data stay isolated.
          </p>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            { step: '01', title: 'Create a workspace', desc: 'Name it after your business or brand' },
            { step: '02', title: 'Add your clients', desc: 'Import or manually add client profiles' },
            { step: '03', title: 'Start disputing', desc: 'Generate letters and track progress' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{item.step}</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-blue-100 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right content panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <AppLogo size={32} />
            <span className="font-bold text-lg text-foreground">Fix My Money</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-1">Set up your workspace</h1>
            <p className="text-sm text-muted-foreground">
              {workspaces.length === 0
                ? 'Create your first credit repair business workspace to get started.' :'Manage your workspaces or continue to your dashboard.'}
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Workspace list */}
              {workspaces.length > 0 && (
                <div className="space-y-2 mb-5">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                        activeWorkspaceId === ws.id
                          ? 'border-primary bg-primary/5' :'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (editingId !== ws.id) setActiveWorkspaceId(ws.id);
                      }}
                    >
                      {/* Initials avatar */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          activeWorkspaceId === ws.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getInitials(ws.name)}
                      </div>

                      {/* Name / edit input */}
                      <div className="flex-1 min-w-0">
                        {editingId === ws.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameWorkspace(ws.id);
                              if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="input-field py-1 text-sm h-auto"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-foreground truncate">{ws.name}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {editingId === ws.id ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRenameWorkspace(ws.id); }}
                            disabled={saving}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            aria-label="Save name"
                          >
                            <Check size={13} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(ws.id);
                                setEditingName(ws.name);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                              aria-label="Rename workspace"
                            >
                              <Pencil size={13} />
                            </button>
                            {workspaces.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                                aria-label="Delete workspace"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            {activeWorkspaceId === ws.id && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check size={11} className="text-primary-foreground" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create workspace form */}
              {showCreateForm ? (
                <form onSubmit={handleCreateWorkspace} className="mb-5">
                  <div className="border border-primary/40 rounded-xl p-4 bg-primary/3">
                    <label className="label-text">Business name</label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); setError(''); }}
                        placeholder="Enter your business name"
                        className="input-field pl-9"
                      />
                    </div>
                    {error && <p className="error-text mt-1">{error}</p>}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="submit"
                        disabled={creating}
                        className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                      >
                        {creating ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><Plus size={14} /> Create</>
                        )}
                      </button>
                      {workspaces.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setShowCreateForm(false); setNewName(''); setError(''); }}
                          className="btn-secondary py-2 px-4 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-150 mb-5 text-sm font-medium"
                >
                  <Plus size={15} />
                  Add another workspace
                </button>
              )}

              {/* Continue button */}
              {workspaces.length > 0 && (
                <button
                  onClick={handleContinue}
                  disabled={!activeWorkspaceId}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                >
                  Continue to Dashboard
                  <ChevronRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <ChatbotWidget context="workspace-setup" />
    </div>
  );
}
