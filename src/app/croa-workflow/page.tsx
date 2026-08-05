import React from 'react';
import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';
import { Shield, ArrowRight, CheckCircle, Clock, AlertTriangle, FileText, Users, DollarSign, Eye, ChevronRight,  } from 'lucide-react';

export const metadata: Metadata = createSeoMetadata("/croa-workflow");

const WORKFLOW_STAGES = [
  {
    id: 'lead',
    step: '01',
    title: 'Lead',
    description: 'Prospect enters the pipeline. Initial contact recorded. Qualification begins.',
    icon: Users,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    indicators: ['Contact information captured', 'Source tracked', 'Initial qualification notes'],
    required: false,
  },
  {
    id: 'disclosure',
    step: '02',
    title: 'Disclosure',
    description: 'CROA-required disclosures delivered to the prospect before any agreement is signed.',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    indicators: ['Disclosure document delivered', 'Delivery method recorded', 'Timestamp logged', 'User attribution recorded'],
    required: true,
    requiredNote: 'CROA requires disclosure before any agreement',
  },
  {
    id: 'agreement',
    step: '03',
    title: 'Agreement',
    description: 'Written contract executed. Agreement includes all CROA-required terms.',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    indicators: ['Agreement document stored', 'Execution date recorded', 'Version tracked', 'User attribution recorded'],
    required: true,
    requiredNote: 'Written agreement required before services begin',
  },
  {
    id: 'cancellation',
    step: '04',
    title: 'Cancellation Period',
    description: 'CROA-required 3-business-day cancellation window. No services may begin until this period expires.',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    indicators: ['Cancellation window start date', 'Cancellation window expiration date', 'Cancellation notice tracking', 'Compliance warning if services attempted early'],
    required: true,
    requiredNote: 'Services cannot begin until cancellation period expires',
  },
  {
    id: 'active',
    step: '05',
    title: 'Active Client',
    description: 'Cancellation period expired. Services may begin. Client is active in the platform.',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    indicators: ['Activation date recorded', 'Billing eligibility confirmed', 'Service scope documented', 'Team assignment recorded'],
    required: false,
  },
  {
    id: 'disputes',
    step: '06',
    title: 'Disputes',
    description: 'Credit report analysis, dispute letter generation, and bureau correspondence management.',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    indicators: ['Dispute rounds tracked', 'Bureau responses logged', 'Letter versions stored', 'Timeline documented'],
    required: false,
  },
  {
    id: 'monitoring',
    step: '07',
    title: 'Monitoring',
    description: 'Ongoing monitoring of bureau responses, dispute outcomes, and client credit profile.',
    icon: Eye,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    indicators: ['Response tracking', 'Outcome documentation', 'Follow-up scheduling', 'Client communication logs'],
    required: false,
  },
  {
    id: 'completed',
    step: '08',
    title: 'Completed',
    description: 'Services completed. Completed-service documentation generated. Billing eligibility confirmed.',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    indicators: ['Completed services documented', 'Final billing eligibility confirmed', 'Client record archived', 'Audit log finalized'],
    required: false,
  },
];

const COMPLIANCE_FEATURES = [
  {
    icon: Clock,
    title: 'Cancellation Window Tracking',
    body: 'The platform tracks the CROA-required 3-business-day cancellation period and displays a compliance warning if any service action is attempted before the window expires.',
  },
  {
    icon: FileText,
    title: 'Document Version History',
    body: 'All disclosure forms, agreements, and compliance documents are stored with version history, execution dates, and delivery records.',
  },
  {
    icon: Eye,
    title: 'Status History and Timestamps',
    body: 'Every workflow stage transition is recorded with a timestamp and the user who made the change. Status history cannot be edited.',
  },
  {
    icon: DollarSign,
    title: 'Billing Eligibility Indicators',
    body: 'The platform indicates when billing is eligible based on workflow stage. Billing is not marked eligible until the cancellation period has expired and the client is in Active status.',
  },
  {
    icon: Shield,
    title: 'Completed Service Documentation',
    body: 'When services are marked complete, the platform generates a completed-service record documenting what was performed, when, and by whom.',
  },
  {
    icon: AlertTriangle,
    title: 'Compliance Warnings',
    body: 'The platform displays warnings when required steps are incomplete or when actions are attempted out of sequence.',
  },
];

export default function CROAWorkflowPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
            <Link href="/demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl hidden sm:block">Book Demo</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Shield size={13} />
            CROA-Aware Workflow
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Structured workflow for credit repair agencies
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            FixMy.Money provides a structured workflow designed to support CROA-aware operations — from lead intake through disclosure, agreement, cancellation period, active services, and completed documentation.
          </p>

          {/* Legal Disclaimer */}
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-2xl px-6 py-4 max-w-2xl mx-auto">
            <div className="flex items-start gap-3 text-left">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200 leading-relaxed">
                <strong className="text-amber-100">Important:</strong> FixMy.Money provides workflow, documentation, and recordkeeping tools. Each business remains responsible for complying with federal, state, and local laws. This software does not provide legal advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Stages */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Workflow Stages</p>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Lead to Completed</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Eight structured stages guide each client from initial contact through completed services, with required-step indicators and compliance warnings at each stage.
            </p>
          </div>

          {/* Stage flow indicator */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12 text-xs font-semibold">
            {WORKFLOW_STAGES.map((stage, idx) => (
              <React.Fragment key={stage.id}>
                <div className={`px-3 py-1.5 rounded-full border ${stage.required ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {stage.title}
                  {stage.required && <span className="ml-1 text-blue-500">*</span>}
                </div>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <ChevronRight size={14} className="text-slate-300" />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mb-12">* Required step with compliance indicators</p>

          {/* Stage Cards */}
          <div className="space-y-6">
            {WORKFLOW_STAGES.map((stage) => {
              const StageIcon = stage.icon;
              return (
                <div key={stage.id} className={`rounded-2xl border-2 p-6 ${stage.border} ${stage.bg}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-slate-400 w-6">{stage.step}</span>
                      <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center border ${stage.border}`}>
                        <StageIcon size={20} className={stage.color} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-extrabold text-slate-900 text-lg">{stage.title}</h3>
                        {stage.required && (
                          <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            Required Step
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">{stage.description}</p>
                      {stage.requiredNote && (
                        <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                          <p className="text-xs font-semibold text-amber-700">{stage.requiredNote}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stage.indicators.map((indicator) => (
                          <div key={indicator} className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                            {indicator}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compliance Features */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Compliance Tools</p>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Built-in compliance support</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Tools designed to help agencies document their work responsibly. Not a substitute for legal counsel.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPLIANCE_FEATURES.map((feat) => {
              const FeatIcon = feat.icon;
              return (
                <div key={feat.title} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <FeatIcon size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">{feat.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feat.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-2">Legal Disclaimer</p>
                <p className="text-sm text-amber-700 leading-relaxed mb-3">
                  FixMy.Money provides workflow, documentation, and recordkeeping tools. Each business remains responsible for complying with federal, state, and local laws, including the Credit Repair Organizations Act (CROA), the Fair Credit Reporting Act (FCRA), the Telemarketing Sales Rule (TSR), and all applicable state regulations.
                </p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  This software does not provide legal advice. Consult a qualified attorney for guidance on your specific compliance obligations.
                </p>
                <Link href="/compliance" className="text-xs font-semibold text-amber-800 underline mt-2 inline-block">
                  View Compliance Information →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Build your credit repair agency on solid operational foundations
          </h2>
          <p className="text-slate-400 mb-8">Start your 14-day trial for $1. Full platform access. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up-login-screen?tab=register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all"
            >
              Start $1 Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
