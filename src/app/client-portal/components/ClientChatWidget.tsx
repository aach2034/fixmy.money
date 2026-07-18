'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Send, X, ChevronDown, Circle } from 'lucide-react';

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

interface ClientChatWidgetProps {
  clientAccountId: string;
  clientName: string;
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ClientChatWidget({ clientAccountId, clientName }: ClientChatWidgetProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Get or create conversation for this client
  const initConversation = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      // Look for existing open conversation
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('client_account_id', clientAccountId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let convId = existing?.id;

      if (!convId) {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('chat_conversations')
          .insert({
            client_account_id: clientAccountId,
            status: 'open',
            subject: `Support Chat - ${clientName}`,
          })
          .select('id')
          .single();

        if (error) { console.error(error); return; }
        convId = newConv.id;
      }

      setConversationId(convId);

      // Load messages
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);

      // Mark specialist messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .eq('sender_type', 'specialist')
        .eq('is_read', false);

      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId, clientName, supabase]);

  // Check unread count when widget is closed
  const checkUnread = useCallback(async () => {
    if (!clientAccountId) return;
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('client_account_id', clientAccountId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing?.id) return;

    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', existing.id)
      .eq('sender_type', 'specialist')
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, [clientAccountId, supabase]);

  useEffect(() => {
    checkUnread();
  }, [checkUnread]);

  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    }
  }, [isOpen, conversationId, initConversation]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`client_chat_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_type === 'specialist') {
          if (!isOpen) {
            setUnreadCount((prev) => prev + 1);
          } else {
            // Mark as read immediately
            supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, conversationId, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_type: 'client',
        sender_id: clientAccountId,
        sender_name: clientName,
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
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '480px' }}>
          {/* Header */}
          <div className="px-4 py-3 bg-primary flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Support Chat</p>
                <div className="flex items-center gap-1">
                  <Circle size={6} className="text-green-300 fill-green-300" />
                  <span className="text-xs text-white/80">We typically reply in minutes</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Hi {clientName?.split(' ')[0]}! 👋</p>
                <p className="text-xs text-muted-foreground">
                  Send us a message and a support specialist will respond shortly.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isClient = msg.sender_type === 'client';
                  const showName = idx === 0 || messages[idx - 1]?.sender_type !== msg.sender_type;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                      {showName && (
                        <span className="text-2xs text-muted-foreground mb-1 px-1">
                          {isClient ? 'You' : msg.sender_name || 'Support Specialist'}
                        </span>
                      )}
                      <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isClient
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-2xs text-muted-foreground mt-0.5 px-1">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className="flex-1 px-3.5 py-2 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-2xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
