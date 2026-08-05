import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';
import { Shield, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = createSeoMetadata("/compliance");

const COMPLIANCE_ITEMS = [
  { title: 'Credit Repair Organizations Act (CROA)', body: 'CROA governs credit repair organizations and requires specific disclosures, prohibits advance fees in certain circumstances, and mandates written contracts. Users of FixMy.Money are solely responsible for CROA compliance in their business operations. FixMy.Money provides CROA-aware workflow tools and documentation templates to support your process.' },
  { title: 'Fair Credit Reporting Act (FCRA)', body: 'The FCRA regulates how consumer credit information is collected, used, and shared. Credit repair professionals must understand FCRA provisions related to dispute rights, permissible purpose, and consumer disclosures.' },
  { title: 'Telemarketing Sales Rule (TSR)', body: "The FTC's TSR restricts advance fees for credit repair services sold via telemarketing. If you market your services by phone, you must comply with TSR requirements." },
  { title: 'State Laws', body: "Many states have additional credit repair laws beyond federal requirements. Some states require registration, bonding, or specific disclosures. Consult a qualified attorney familiar with your state's laws." },
  { title: 'Client Disclosures', body: 'CROA requires specific written disclosures to clients before any services are performed. FixMy.Money provides disclosure templates to support your workflow, but you are responsible for ensuring they meet current legal requirements in your jurisdiction.' },
  { title: 'No Guaranteed Results', body: 'Federal law prohibits credit repair organizations from making false or misleading representations. Do not guarantee credit score improvements, item removals, or specific outcomes. Results depend on individual circumstances.' },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Compliance Information</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">Last updated: June 2026</p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Important Notice</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              FixMy.Money is not a law firm and does not provide legal advice. Users are responsible for their own contracts, disclosures, fees, client communications, and legal compliance. FixMy.Money provides software tools to support your compliance process — not legal guidance. Consult a qualified attorney for legal advice specific to your business.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {COMPLIANCE_ITEMS.map(item => (
            <div key={item.title} className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-slate-900 mb-2 text-sm">{item.title}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Related: <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> · <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> · <Link href="/security" className="text-blue-600 hover:underline">Security</Link>
          </p>
        </div>

        <div className="mt-6 bg-slate-900 rounded-2xl p-6 text-center">
          <p className="text-white font-bold mb-2">Tools to support your compliance process</p>
          <p className="text-slate-400 text-sm mb-4">FixMy.Money includes CROA-aware workflow tools, disclosure templates, and audit trails to support your operations.</p>
          <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
            Start Agency Trial
          </Link>
        </div>
      </div>
    </div>
  );
}
