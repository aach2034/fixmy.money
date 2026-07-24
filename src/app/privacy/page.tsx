import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | FixMy.Money',
  description: 'Privacy Policy for FixMy.Money. Learn how we collect, use, and protect your data and your clients\' data on our credit repair software platform.',
  alternates: { canonical: 'https://fixmy.money/privacy' },
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Last updated: July 2026</p>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <p className="text-slate-600">FixMy.Money (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>

          <h2 className="text-lg font-bold text-slate-900">1. Information We Collect</h2>
          <p className="text-slate-600">We collect information you provide directly (account registration, billing, client data you upload), information collected automatically (usage data, log files, cookies), and information from third-party services (Stripe for payment processing, Supabase for data storage).</p>

          <h2 className="text-lg font-bold text-slate-900">2. How We Use Your Information</h2>
          <p className="text-slate-600">We use collected information to provide and improve our services, process payments, send transactional communications, ensure platform security, and comply with legal obligations. We do not sell your personal data to third parties.</p>

          <h2 className="text-lg font-bold text-slate-900">3. Client Data Responsibility</h2>
          <p className="text-slate-600">You are responsible for obtaining appropriate consent from your clients before uploading their personal or financial data to FixMy.Money. You are the data controller for your clients&apos; information. FixMy.Money acts as a data processor on your behalf.</p>

          <h2 className="text-lg font-bold text-slate-900">4. Data Security</h2>
          <p className="text-slate-600">We implement enterprise-grade encryption, role-based access controls, and secure cloud infrastructure. Client data is isolated per workspace. However, no method of transmission over the internet is 100% secure. See our <Link href="/security" className="text-blue-600 hover:underline">Security page</Link> for details.</p>

          <h2 className="text-lg font-bold text-slate-900">5. Data Retention</h2>
          <p className="text-slate-600">We retain your data for as long as your account is active or as needed to provide services. Upon account cancellation, you may request deletion of your data by contacting support@fixmy.money.</p>

          <h2 className="text-lg font-bold text-slate-900">6. Cookies</h2>
          <p className="text-slate-600">We use cookies and similar tracking technologies to improve your experience, analyze usage, and support analytics. You can control cookie settings through your browser.</p>

          <h2 className="text-lg font-bold text-slate-900">7. Third-Party Services</h2>
          <p className="text-slate-600">We use Stripe for payment processing, Supabase for database infrastructure, and Google Analytics for usage analytics. Each of these services has its own privacy policy governing their use of data.</p>

          <h2 className="text-lg font-bold text-slate-900">8. Email Resources and Marketing</h2>
          <p className="text-slate-600">When you request a resource or opt in to product updates, we collect your email address, the requested resource, signup source, and consent timestamp. We use this information to deliver the resource and send occasional FixMy.Money product and workflow emails. You can unsubscribe at any time using the link in an email or by contacting support@fixmy.money.</p>

          <h2 className="text-lg font-bold text-slate-900">9. Your Rights</h2>
          <p className="text-slate-600">You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at support@fixmy.money.</p>

          <h2 className="text-lg font-bold text-slate-900">10. Contact</h2>
          <p className="text-slate-600">For privacy-related questions, contact us at <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>
        </div>

        <div className="mt-10 bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Related: <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> · <Link href="/security" className="text-blue-600 hover:underline">Security</Link> · <Link href="/compliance" className="text-blue-600 hover:underline">Compliance Information</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
