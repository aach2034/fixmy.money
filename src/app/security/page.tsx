import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Lock,
  ArrowLeft,
  Shield,
  Server,
  Key,
  Eye,
  Database,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Globe,
  Trash2,
  Download,
  Bot,
  Phone,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security | FixMy.Money Credit Repair Software',
  description:
    'How FixMy.Money protects your agency data and your clients\' data. Encryption, access controls, audit logging, tenant isolation, and responsible disclosure.',
  alternates: { canonical: 'https://fixmy.money/security' },
  openGraph: {
    title: 'Security | FixMy.Money',
    description: 'How FixMy.Money protects your agency and client data.',
    type: 'website',
    url: 'https://fixmy.money/security',
    siteName: 'FixMy.Money',
  },
};

const SECURITY_SECTIONS = [
  {
    icon: Globe,
    title: 'Encryption in Transit',
    body: 'All data transmitted between your browser and FixMy.Money is encrypted using TLS 1.2 or higher. This applies to all API requests, file uploads, and authentication flows.',
  },
  {
    icon: Database,
    title: 'Encryption at Rest',
    body: 'Data stored in the FixMy.Money database is encrypted at rest. This is provided by our infrastructure provider, Supabase, which runs on enterprise-grade cloud infrastructure.',
  },
  {
    icon: UserCheck,
    title: 'Authentication',
    body: 'FixMy.Money uses Supabase Auth for secure authentication. This includes email verification, session management, secure password handling, and support for Google OAuth. We recommend enabling two-factor authentication for all team accounts.',
  },
  {
    icon: Shield,
    title: 'Row-Level Security (RLS)',
    body: 'Every sensitive database table has Row-Level Security policies enforced at the database level. These policies ensure that queries only return records belonging to the authenticated user\'s organization — even if application-level code has a bug.',
  },
  {
    icon: Key,
    title: 'Workspace Isolation',
    body: 'Each agency account operates in an isolated workspace. Client records, documents, disputes, billing data, and audit logs are scoped to your organization ID. No user can query another organization\'s data.',
  },
  {
    icon: Eye,
    title: 'Role-Based Permissions',
    body: 'Team members are assigned roles that control what they can view and modify. Admin roles are protected and cannot be self-assigned. Service-role keys are never exposed to client-side code.',
  },
  {
    icon: Lock,
    title: 'Audit Logging',
    body: 'All significant platform actions are recorded in an immutable audit log with timestamps and user attribution. Standard users cannot edit or delete audit log entries. Audit logs support your compliance documentation.',
  },
  {
    icon: Server,
    title: 'Infrastructure and Backups',
    body: 'FixMy.Money runs on Supabase, which provides automated database backups, high availability, and enterprise-grade cloud infrastructure. Supabase maintains its own security certifications for its infrastructure. FixMy.Money itself has not completed SOC 2 certification.',
  },
  {
    icon: Trash2,
    title: 'Data Retention and Deletion',
    body: 'You can request deletion of your account and associated data. Upon account deletion, your organization\'s data is removed from active systems. Contact support@fixmy.money to initiate a data deletion request.',
  },
  {
    icon: Download,
    title: 'Data Export',
    body: 'Agency and Professional plan subscribers can export their client data, dispute records, and documents. Contact support@fixmy.money if you need assistance with a data export.',
  },
  {
    icon: Shield,
    title: 'Payment Security',
    body: 'All payment processing is handled by Stripe, a PCI DSS Level 1 certified payment processor. FixMy.Money never stores raw credit card numbers or sensitive payment data. Stripe maintains its own security certifications.',
  },
  {
    icon: Bot,
    title: 'AI Data Handling',
    body: 'When you use AI features, credit report data and client information is sent to our AI processing pipeline. We do not use your uploaded credit reports or client data to train AI models. AI-generated content must be reviewed by an authorized user before it is sent, filed, or relied upon.',
  },
  {
    icon: Phone,
    title: 'Two-Factor Authentication',
    body: 'Two-factor authentication is available through Google OAuth. We recommend all team members enable 2FA on their Google accounts when using Google sign-in. Native TOTP 2FA is on our roadmap.',
  },
  {
    icon: AlertTriangle,
    title: 'Incident Response',
    body: 'In the event of a security incident affecting your data, we will notify affected customers as required by applicable law. Security incidents should be reported to security@fixmy.money.',
  },
];

const SUBPROCESSORS = [
  { name: 'Supabase', purpose: 'Database, authentication, and file storage', location: 'United States' },
  { name: 'Stripe', purpose: 'Payment processing and billing', location: 'United States' },
  { name: 'OpenAI', purpose: 'AI credit report analysis and letter generation', location: 'United States' },
  { name: 'Google Analytics', purpose: 'Anonymous usage analytics', location: 'United States' },
  { name: 'Vercel', purpose: 'Application hosting and edge delivery', location: 'United States' },
];

const ADMIN_CHECKLIST = [
  'Enable two-factor authentication on your account',
  'Review team member access and remove inactive users',
  'Verify that all team members have appropriate role assignments',
  'Review the audit log periodically for unexpected activity',
  'Ensure client documents are organized and access-controlled',
  'Confirm billing contact information is current',
  'Review and update your workspace settings',
  'Test your client portal login to verify it works correctly',
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/signup" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Lock size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Security</h1>
        </div>
        <p className="text-sm text-slate-500 mb-2">Last updated: June 2026</p>
        <p className="text-slate-600 text-sm leading-relaxed mb-10">
          FixMy.Money handles sensitive client data on behalf of credit repair agencies. This page describes the security measures we have implemented and the claims we can verify. We only state what is technically accurate.
        </p>

        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-10">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Verified Claims Only</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                This page only describes security measures that are technically implemented and verifiable. FixMy.Money has not completed SOC 2 certification. Infrastructure providers (Supabase, Stripe, Vercel) maintain their own certifications for their respective services.
              </p>
            </div>
          </div>
        </div>

        {/* Security Sections */}
        <div className="space-y-4 mb-12">
          {SECURITY_SECTIONS.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.title} className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ItemIcon size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 mb-1.5 text-sm">{item.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subprocessors */}
        <div className="mb-12">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Subprocessors</h2>
          <p className="text-sm text-slate-600 mb-5">
            FixMy.Money uses the following third-party services to deliver the platform. Each subprocessor handles data only as necessary to provide their service.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Provider</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Purpose</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SUBPROCESSORS.map((sp) => (
                  <tr key={sp.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">{sp.name}</td>
                    <td className="px-4 py-3 text-slate-600">{sp.purpose}</td>
                    <td className="px-4 py-3 text-slate-600">{sp.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Checklist */}
        <div className="mb-12">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Security Checklist for Administrators</h2>
          <p className="text-sm text-slate-600 mb-5">
            Recommended steps for agency administrators to maintain a secure FixMy.Money environment.
          </p>
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <ul className="space-y-3">
              {ADMIN_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Responsible Disclosure */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <p className="text-sm font-bold text-amber-800 mb-2">Responsible Disclosure</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            If you discover a security vulnerability in FixMy.Money, please report it responsibly to{' '}
            <a href="mailto:security@fixmy.money" className="text-amber-800 font-semibold underline hover:no-underline">
              security@fixmy.money
            </a>
            . Please do not publicly disclose vulnerabilities before we have had a reasonable opportunity to investigate and respond. We take all security reports seriously.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Related:{' '}
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            {' · '}
            <Link href="/compliance" className="text-blue-600 hover:underline">Compliance Information</Link>
            {' · '}
            <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
            {' · '}
            <Link href="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
