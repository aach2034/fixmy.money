'use client';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Plus,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'video' | 'phone';
  status: 'upcoming' | 'completed' | 'cancelled';
  coach: string;
  notes?: string;
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Credit Score Strategy Session',
    date: 'Jun 5, 2026',
    time: '10:00 AM',
    type: 'video',
    status: 'upcoming',
    coach: 'Sarah Johnson',
    notes: 'Review dispute letters and credit utilization plan',
  },
  {
    id: '2',
    title: 'Debt Elimination Planning',
    date: 'May 28, 2026',
    time: '2:00 PM',
    type: 'phone',
    status: 'completed',
    coach: 'Marcus Williams',
    notes: 'Created snowball payoff plan for 4 accounts',
  },
  {
    id: '3',
    title: 'Budget Review & Savings Goals',
    date: 'May 15, 2026',
    time: '11:00 AM',
    type: 'video',
    status: 'completed',
    coach: 'Sarah Johnson',
  },
  {
    id: '4',
    title: 'Initial Financial Assessment',
    date: 'May 1, 2026',
    time: '3:00 PM',
    type: 'video',
    status: 'completed',
    coach: 'Marcus Williams',
  },
];

const CALENDLY_URL = 'https://calendly.com';

export default function AppointmentsContent() {
  const [appointments] = useState<Appointment[]>(mockAppointments);
  const [showScheduler, setShowScheduler] = useState(false);
  const [calendlyLoaded, setCalendlyLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (showScheduler) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => setCalendlyLoaded(true);
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [showScheduler]);

  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  const past = appointments.filter((a) => a.status !== 'upcoming');

  const statusConfig = {
    upcoming: { label: 'Upcoming', color: 'bg-primary/10 text-primary', icon: Clock },
    completed: { label: 'Completed', color: 'bg-success-bg text-success', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-danger-bg text-danger', icon: XCircle },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule and manage your coaching sessions</p>
        </div>
        <button
          onClick={() => setShowScheduler(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Schedule Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Completed', value: past.filter((a) => a.status === 'completed').length, color: 'text-success', bg: 'bg-success-bg' },
          { label: 'Total Sessions', value: appointments.length, color: 'text-foreground', bg: 'bg-muted' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendly Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                <h2 className="font-semibold text-foreground">Schedule a Coaching Session</h2>
              </div>
              <button onClick={() => setShowScheduler(false)} className="btn-ghost p-1.5">
                <XCircle size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!calendlyLoaded ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <RefreshCw size={32} className="text-primary animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading scheduler...</p>
                </div>
              ) : (
                <div
                  className="calendly-inline-widget"
                  data-url={`${CALENDLY_URL}/fixmymoney/coaching-session`}
                  style={{ minWidth: '320px', height: '500px' }}
                />
              )}

              {/* Fallback when Calendly URL not configured */}
              <div className="mt-6 p-4 bg-info-bg border border-info/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-info shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Connect Your Calendly Account</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      To enable appointment scheduling, connect your Calendly account in Settings. Your clients will be able to book sessions directly from this page.
                    </p>
                    <a
                      href="https://calendly.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-2"
                    >
                      Set up Calendly
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="card overflow-hidden">
        <div className="flex gap-1 p-3 border-b border-border bg-muted/30">
          {(['upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>

        <div className="divide-y divide-border">
          {(activeTab === 'upcoming' ? upcoming : past).map((appt) => {
            const status = statusConfig[appt.status];
            const StatusIcon = status.icon;
            return (
              <div key={appt.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    appt.type === 'video' ? 'bg-primary/10' : 'bg-info-bg'
                  }`}>
                    {appt.type === 'video' ? (
                      <Video size={18} className="text-primary" />
                    ) : (
                      <Phone size={18} className="text-info" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm">{appt.title}</h3>
                      <span className={`badge ${status.color} border-transparent`}>
                        <StatusIcon size={10} className="mr-1" />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {appt.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {appt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {appt.coach}
                      </span>
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">{appt.notes}</p>
                    )}
                  </div>
                  {appt.status === 'upcoming' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="btn-secondary text-xs px-3 py-1.5">Reschedule</button>
                      <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <Video size={12} />
                        Join
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(activeTab === 'upcoming' ? upcoming : past).length === 0 && (
            <div className="py-12 text-center">
              <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No {activeTab} appointments</p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => setShowScheduler(true)}
                  className="btn-primary mt-4 text-sm"
                >
                  Schedule Your First Session
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendly Setup Info */}
      <div className="card p-5 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Powered by Calendly</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Connect your Calendly account to let clients book coaching sessions directly. Supports video calls, phone sessions, and in-person meetings.
            </p>
            <a
              href="https://calendly.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Connect Calendly Account
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
