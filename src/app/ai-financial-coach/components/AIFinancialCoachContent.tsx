'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { toast } from 'sonner';
import {
  Bot,
  Send,
  User,
  Sparkles,
  TrendingUp,
  DollarSign,
  CreditCard,
  Target,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are an expert AI Financial Coach for FixMy.Money, a personal finance platform. Your role is to help users:
- Improve their credit scores through actionable strategies
- Create debt elimination plans (snowball and avalanche methods)
- Build realistic budgets and savings plans
- Understand their financial health score
- Navigate credit disputes and negative account removal
- Plan for financial goals like home ownership, emergency funds, and retirement

Be warm, encouraging, and practical. Provide specific, actionable advice. Use simple language and avoid jargon. When discussing numbers, be specific. Always end with a clear next step the user can take today.`;

const quickPrompts = [
  { icon: CreditCard, label: 'Improve my credit score', prompt: 'What are the most effective steps I can take right now to improve my credit score?' },
  { icon: DollarSign, label: 'Debt payoff strategy', prompt: 'I have multiple debts. Help me create a debt payoff strategy using the snowball or avalanche method.' },
  { icon: Target, label: 'Build an emergency fund', prompt: 'How do I build a 3-6 month emergency fund while still paying off debt?' },
  { icon: TrendingUp, label: 'Boost my financial score', prompt: 'My financial health score is low. What are the top 3 things I should focus on to improve it?' },
];

const tips = [
  '💡 Pay more than the minimum on high-interest debt to save thousands in interest.',
  '💡 Keeping credit utilization below 30% can boost your score by 50+ points.',
  '💡 Setting up autopay prevents missed payments — the #1 factor in your credit score.',
  '💡 A secured credit card is one of the fastest ways to build credit from scratch.',
  '💡 Disputing errors on your credit report is free and can raise your score quickly.',
];

export default function AIFinancialCoachContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentTip, setCurrentTip] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-4o', true);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  useEffect(() => {
    if (response && !isLoading) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { role: 'assistant', content: response }];
        }
        return [...prev, { role: 'assistant', content: response }];
      });
    }
  }, [response, isLoading]);

  useEffect(() => {
    if (isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    }
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    const newMessages = [...messages.filter((m) => m.content !== ''), userMessage];
    setMessages(newMessages);
    setInput('');

    const apiMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...newMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    sendMessage(apiMessages, { max_completion_tokens: 1024 });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">AI Financial Coach</h1>
              <p className="text-xs text-muted-foreground">Powered by OpenAI · Personalized financial guidance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-success-bg text-success text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Online
            </div>
            {messages.length > 0 && (
              <button onClick={handleReset} className="btn-ghost flex items-center gap-1.5">
                <RefreshCw size={14} />
                New Chat
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkles size={36} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Your AI Financial Coach</h2>
                <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                  Ask me anything about improving your credit, eliminating debt, building a budget, or achieving your financial goals.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {quickPrompts.map((qp) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.label}
                        onClick={() => handleSend(qp.prompt)}
                        className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{qp.label}</span>
                        <ChevronRight size={14} className="text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user' ?'bg-primary text-primary-foreground rounded-tr-sm' :'bg-card border border-border text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.content === '' && isLoading ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card px-6 py-4 shrink-0">
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI Financial Coach anything..."
                rows={1}
                className="flex-1 input-field resize-none min-h-[44px] max-h-32 py-3"
                style={{ height: 'auto' }}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="btn-primary flex items-center gap-2 h-11 px-5 shrink-0"
              >
                <Send size={16} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="text-2xs text-muted-foreground mt-2">
              Press Enter to send · Shift+Enter for new line · AI responses are for educational purposes only
            </p>
          </div>
        </div>

        {/* Sidebar Tips */}
        <div className="hidden lg:flex flex-col w-72 border-l border-border bg-card p-4 gap-4 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              Daily Financial Tip
            </h3>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-foreground leading-relaxed transition-all duration-500">
                {tips[currentTip]}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Topics</h3>
            <div className="space-y-2">
              {[
                'How to dispute a collection account',
                'Best way to pay off credit card debt',
                'How to build credit with no history',
                'What is a good debt-to-income ratio?',
                'How to negotiate with creditors',
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleSend(topic)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
            <h3 className="text-sm font-semibold text-foreground mb-2">Your Financial Score</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-black text-primary">72</div>
              <div>
                <div className="text-xs font-medium text-foreground">Good</div>
                <div className="text-2xs text-muted-foreground">+8 this month</div>
              </div>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '72%' }} />
            </div>
            <p className="text-2xs text-muted-foreground mt-2">Ask your coach how to reach 90+</p>
          </div>
        </div>
      </div>
    </div>
  );
}
