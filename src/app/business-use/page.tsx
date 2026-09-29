import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '@/components/marketing/PublicFooter';
import { BUSINESS_USE_POLICY_VERSION } from '@/lib/signup/business-policy';

export const metadata: Metadata = {
  title: 'Business Use Policy',
  description: 'Business-only software use, purchaser declarations, client authorization, and prohibited conduct for FixMy.Money.',
};

export default function BusinessUsePage() {
  return <>
    <section className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-slate-700">
      <Link href="/" className="text-blue-700 underline">Back to FixMy.Money</Link>
      <h1 className="text-3xl font-bold text-slate-900">Business Use Policy</h1>
      <p className="text-sm">Version {BUSINESS_USE_POLICY_VERSION} · September 28, 2026</p>
      <h2 className="text-xl font-bold text-slate-900">Who the software is for</h2>
      <p>New Start and Grow accounts are for businesses managing client-service operations. The purchaser must be authorized to act for that business. A business name, LLC filing, or checkbox alone does not establish eligibility for every service or jurisdiction. Personal-use subscriptions are no longer offered; existing subscriptions are not changed by this announcement.</p>
      <h2 className="text-xl font-bold text-slate-900">Software access, not consumer services</h2>
      <p>FixMy.Money provides client records, report-review tools, editable correspondence, and workflow tracking. We do not perform credit repair for your clients, promise results, sell a guaranteed business opportunity, or determine what you can charge consumers. A software subscription is not evidence that a consumer service has been completed.</p>
      <h2 className="text-xl font-bold text-slate-900">Your responsibilities</h2>
      <p>Use client information only with appropriate authorization. Review reports and correspondence before use, preserve accurate records, and comply with the laws applicable to your marketing, services, fees, and locations. Do not submit false disputes, fabricate evidence, impersonate a consumer, promise deletions or score increases, or use the platform to collect unlawful advance fees. FixMy.Money does not recommend monthly consumer charges or provide phone or video sales scripts for soliciting credit-repair purchases.</p>
      <h2 className="text-xl font-bold text-slate-900">Declarations, review, and concerns</h2>
      <p>Provide truthful business information and notify support of material changes to your business use. A signup declaration and email verification are not business verification or legal approval. We may request supporting information and restrict or suspend use for violations under the Terms of Service. Report suspected misuse to <a href="mailto:support@fixmy.money" className="text-blue-700 underline">support@fixmy.money</a>; do not email unredacted credit reports or identity documents.</p>
      <p>New paid activation remains on hold. This policy does not activate a subscription or guarantee legal compliance. Read the <Link href="/terms-of-service" className="text-blue-700 underline">Terms of Service</Link> and seek qualified advice for your own business.</p>
    </section>
    <PublicFooter />
  </>;
}
