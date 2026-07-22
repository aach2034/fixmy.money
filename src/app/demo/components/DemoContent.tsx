'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Play,
  Monitor,
  Zap,
  Shield,
} from 'lucide-react';
import { trackDemoRequest } from '@/lib/analytics';

const demoHighlights = [
  { icon: Monitor, title: 'Evidence Workflow Walkthrough', desc: 'See report import, source-linked facts, review controls, delivery history, and bureau outcomes.' },
  { icon: Users, title: 'Q&A Session', desc: 'Ask anything about the platform and how it fits your agency workflow.' },
  { icon: Zap, title: 'Custom Use Case Review', desc: "We\'ll tailor the demo to your agency size and workflow." },
  { icon: Shield, title: 'CROA-Aware Workflow Review', desc: 'See how FixMy.Money supports documentation, disclosures, dispute tracking, and CROA-aware workflows.' },
];

const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

export default function DemoContent() {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', size: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackDemoRequest(form.size);
    const subject = encodeURIComponent(`FixMy.Money demo request — ${form.company || form.name}`);
    const body = encodeURIComponent([
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Company: ${form.company}`,
      `Agency size: ${form.size}`,
      `Preferred time: ${selectedTime || 'Flexible'}`,
      '',
      'Please contact me to confirm a 30-minute FixMy.Money demo.',
    ].join('\n'));
    window.location.href = `mailto:sales@fixmy.money?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">FM</span>
            </div>
            <span className="font-bold text-white">FixMy.Money</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Play size={13} className="text-emerald-400" />
              <span className="text-emerald-300 text-sm font-medium">Live Demo</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
              See FixMy.Money in action — live
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10">
              Book a 30-minute personalized demo. We'll walk through the platform and show you exactly how FixMy.Money can fit your agency workflow.
            </p>

            <div className="space-y-5 mb-10">
              {demoHighlights.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <ItemIcon size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm mb-0.5">{item.title}</p>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                30 minutes
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                Available Mon–Fri
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Your email draft is ready</h3>
                <p className="text-gray-400 mb-6">
                  Send the prepared email from your mail app to request the demo. Your time is not reserved until our team replies with a confirmation.
                </p>
                <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                  ← Back to Home
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-6">Book Your Live Demo</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Smith"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Work Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="jane@company.com"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="Your company name"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Team Size</label>
                    <select
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Select team size</option>
                      <option value="solo">Solo (just me)</option>
                      <option value="2-5">2–5 people</option>
                      <option value="6-20">6–20 people</option>
                      <option value="20+">20+ people</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Preferred Time (EST)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 rounded-lg text-xs font-medium transition-all duration-150 border ${
                            selectedTime === slot
                              ? 'bg-emerald-600 border-emerald-500 text-white' :'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600 hover:text-white'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2"
                  >
                    Book My Demo
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    No commitment required. We'll confirm within 1 business hour.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
