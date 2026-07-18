'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { MessageSquare, Send, Search, Circle, CheckCheck, RefreshCw, X, Inbox } from 'lucide-react';

interface Conversation {
  id: string;
  client_account_id: string;
  specialist_id: string | null;
  status: string;
  subject: string;
  last_message_at: string;
  created_at: string;
  client_accounts?: { full_name: string; email: string };
  unread_count?: number;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'client' | 'specialist';
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function LiveChatContent() {
  const supabase = createClient();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*, client_accounts(full_name, email)')
        .order('last_message_at', { ascending: false });

      if (error) { console.error(error); return; }

      // Fetch last message and unread count for each conversation
      const enriched = await Promise.all(
        (data || []).map(async (conv: Conversation) => {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('content, is_read, sender_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .eq('sender_type', 'client');

          return {
            ...conv,
            last_message: msgs?.[0]?.content || '',
            unread_count: count || 0,
          };
        })
      );

      setConversations(enriched);
    } finally {
      setLoadingConvs(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Real-time subscription for conversations
  useEffect(() => {
    const channel = supabase
      .channel('specialist_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const msg = payload.new as Message;
        // Update unread count in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversation_id
              ? {
                  ...c,
                  last_message: msg.content,
                  last_message_at: msg.created_at,
                  unread_count: msg.sender_type === 'client' && selectedConv?.id !== msg.conversation_id
                    ? (c.unread_count || 0) + 1
                    : c.unread_count,
                }
              : c
          )
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadConversations, selectedConv?.id]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) { console.error(error); return; }
      setMessages(data || []);

      // Mark client messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .eq('sender_type', 'client')
        .eq('is_read', false);

      // Update local unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } finally {
      setLoadingMsgs(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv, loadMessages]);

  // Real-time subscription for messages in selected conversation
  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel(`messages_${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read if from client
        if (msg.sender_type === 'client') {
          supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, selectedConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selectedConv.id,
        sender_type: 'specialist',
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email || 'Support Specialist',
        content,
        is_read: false,
      });

      if (error) { console.error(error); setNewMessage(content); }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const closeConversation = async (convId: string) => {
    await supabase.from('chat_conversations').update({ status: 'closed' }).eq('id', convId);
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'closed' } : c));
    if (selectedConv?.id === convId) setSelectedConv((prev) => prev ? { ...prev, status: 'closed' } : null);
  };

  const reopenConversation = async (convId: string) => {
    await supabase.from('chat_conversations').update({ status: 'open' }).eq('id', convId);
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'open' } : c));
    if (selectedConv?.id === convId) setSelectedConv((prev) => prev ? { ...prev, status: 'open' } : null);
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch = !search ||
      c.client_accounts?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_accounts?.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-background">
        {/* Conversations Sidebar */}
        <div className="w-80 shrink-0 flex flex-col border-r border-border bg-card">
          {/* Header */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-primary" />
                <h1 className="font-bold text-foreground text-base">Live Chat</h1>
                {totalUnread > 0 && (
                  <span className="bg-danger text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={loadConversations}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 mt-2">
              {(['all', 'open', 'closed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Inbox size={28} className="text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const clientName = conv.client_accounts?.full_name || 'Unknown Client';
                const initials = clientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{initials}</span>
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                          conv.status === 'open' ? 'bg-success' : 'bg-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-foreground truncate">{clientName}</span>
                          <span className="text-2xs text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message || conv.subject}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${
                            conv.status === 'open' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}>
                            {conv.status}
                          </span>
                          {(conv.unread_count || 0) > 0 && (
                            <span className="bg-danger text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Choose a client conversation from the left panel to start chatting in real time.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {(selectedConv.client_accounts?.full_name || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {selectedConv.client_accounts?.full_name || 'Client'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Circle size={7} className={selectedConv.status === 'open' ? 'text-success fill-success' : 'text-muted-foreground fill-muted-foreground'} />
                      <span className="text-xs text-muted-foreground capitalize">{selectedConv.status}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">{selectedConv.client_accounts?.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedConv.status === 'open' ? (
                    <button
                      onClick={() => closeConversation(selectedConv.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                    >
                      <X size={13} />
                      Close
                    </button>
                  ) : (
                    <button
                      onClick={() => reopenConversation(selectedConv.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/30 transition-colors"
                    >
                      <RefreshCw size={13} />
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare size={24} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isSpecialist = msg.sender_type === 'specialist';
                      const showName = idx === 0 || messages[idx - 1]?.sender_type !== msg.sender_type;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isSpecialist ? 'items-end' : 'items-start'}`}>
                          {showName && (
                            <span className="text-2xs text-muted-foreground mb-1 px-1">
                              {isSpecialist ? msg.sender_name : selectedConv.client_accounts?.full_name || 'Client'}
                            </span>
                          )}
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isSpecialist
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-card border border-border text-foreground rounded-bl-sm'
                          }`}>
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-1 ${isSpecialist ? 'flex-row-reverse' : ''}`}>
                            <span className="text-2xs text-muted-foreground">{formatMessageTime(msg.created_at)}</span>
                            {isSpecialist && (
                              <CheckCheck size={11} className={msg.is_read ? 'text-primary' : 'text-muted-foreground'} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="px-5 py-4 border-t border-border bg-card shrink-0">
                {selectedConv.status === 'closed' ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground bg-muted rounded-xl">
                    <X size={14} />
                    This conversation is closed.
                    <button onClick={() => reopenConversation(selectedConv.id)} className="text-primary hover:underline font-medium">
                      Reopen to reply
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Enter to send)"
                      rows={1}
                      className="flex-1 resize-none px-4 py-2.5 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground max-h-32 overflow-y-auto"
                      style={{ minHeight: '42px' }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
