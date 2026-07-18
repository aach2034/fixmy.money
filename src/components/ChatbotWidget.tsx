'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, RotateCcw } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotWidgetProps {
  context?: 'workspace-setup' | 'dashboard';
}

const SYSTEM_PROMPTS: Record<string, string> = {
  'workspace-setup': `You are Fix My Money Assistant, a helpful onboarding guide for Fix My Money — a credit repair business management platform. You help new users set up their workspace and get started.

You can answer questions about:
- How to create and name workspaces (e.g., naming after their business or brand)
- What workspaces are and how to use multiple ones for different businesses
- How to add clients and start managing credit repair cases
- Best practices for organizing a credit repair business
- What features are available: dispute letter management, client pipeline, AI dispute analyzer, workflow tasks, revenue forecasting, billing, and more
- How to navigate the platform after workspace setup

Keep answers concise, friendly, and actionable. If asked something outside Fix My Money, gently redirect to platform-related topics.`,

  dashboard: `You are Fix My Money Assistant, an AI guide embedded in the Fix My Money dashboard — a credit repair business management platform.

You can answer questions about:
- Dashboard metrics and what they mean (MRR, disputes filed, items deleted, client count)
- How to use features: Dispute Letter Management, Client Pipeline, AI Dispute Analyzer, Workflow & Task Management, Revenue Forecasting, Knowledge Base, Appointments, Affiliate Program, Billing & Subscriptions
- Best practices for running a credit repair business (client communication, dispute strategies, bureau timelines)
- How to interpret AI insights and act on them
- How to grow revenue and reduce client churn
- Credit repair compliance and best practices (CROA, FCRA)
- How to use the AI Financial Coach and other AI tools

Keep answers concise, practical, and specific to credit repair business operations. Be encouraging and expert.`,
};

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  'workspace-setup': [
    'How should I name my workspace?',
    'Can I have multiple workspaces?',
    'What happens after I create a workspace?',
    'How do I add my first client?',
  ],
  dashboard: [
    'What does MRR mean on the dashboard?',
    'How do I dispute a negative item?',
    'Best practices for client retention?',
    'How does the AI dispute analyzer work?',
  ],
};

export default function ChatbotWidget({ context = 'dashboard' }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-4o-mini', true);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  // Append streaming response as assistant message
  const lastAssistantRef = useRef<string>('');
  useEffect(() => {
    if (!response) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: response };
        return updated;
      }
      return [...prev, { role: 'assistant', content: response }];
    });
    lastAssistantRef.current = response;
  }, [response]);

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      const greeting =
        context === 'workspace-setup' ? "Hi! 👋 I'm your Fix My Money setup guide. Ask me anything about creating your workspace or getting started with the platform." :"Hi! 👋 I'm your Fix My Money assistant. Ask me about dashboard metrics, features, or credit repair best practices.";
      setMessages([{ role: 'assistant', content: greeting }]);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted, context]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const buildApiMessages = (userInput: string) => {
    const history = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    return [
      { role: 'system' as const, content: SYSTEM_PROMPTS[context] },
      ...history,
      { role: 'user' as const, content: userInput },
    ];
  };

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    sendMessage(buildApiMessages(msg), { max_completion_tokens: 512 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setHasGreeted(false);
    setInput('');
  };

  const suggestions = SUGGESTED_QUESTIONS[context] ?? [];

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          style={{ maxHeight: '520px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Fix My Money Assistant</p>
              <p className="text-xs text-primary-foreground/70 mt-0.5">Powered by AI</p>
            </div>
            <button
              onClick={handleReset}
              aria-label="Reset conversation"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: '340px' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles size={11} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user' ?'bg-primary text-primary-foreground rounded-br-sm' :'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && isLoading && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-3.5 bg-primary/60 ml-0.5 animate-pulse rounded-sm" />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator when waiting for first chunk */}
            {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Sparkles size={11} className="text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Suggested questions (only when no user messages yet) */}
            {messages.length <= 1 && !isLoading && (
              <div className="space-y-1.5 pt-1">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border bg-background shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-60"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
