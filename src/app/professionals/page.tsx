import type { Metadata } from 'next';
import AcquisitionPage from '@/components/marketing/AcquisitionPage';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'Credit Intelligence Software for Professionals',
  description: 'Credit intelligence and dispute-management software for credit professionals, coaches, mortgage teams, consultants, and agencies.',
  alternates: { canonical: canonicalUrl('/professionals') },
  openGraph: {
    title: 'Credit Intelligence Software for Professionals | FixMy.Money',
    description: 'Client credit-management software for report importing, negative-item review, disputes, letters, tracking, and dashboards.',
    url: canonicalUrl('/professionals'),
    siteName: 'FixMy.Money',
    type: 'website',
  },
};

export default function ProfessionalsPage() {
  return (
    <AcquisitionPage
      audience="professional"
      eyebrow="For professionals"
      title="Credit intelligence and dispute-management software built for professionals."
      description="Manage credit-related workflows for clients with report importing, negative-item identification, dispute workflows, letter generation, client tracking, and a focused dashboard."
      primaryCta={{ label: 'Start $1 Trial', href: '/signup?plan=professional&utm_source=professionals&utm_medium=landing_page&utm_campaign=b2b_acquisition' }}
      secondaryCta={{ label: 'See How It Works', href: '#how-it-works' }}
      features={[
        'Client management and workspace organization',
        'Credit report importing and structured review',
        'Negative-item identification queues',
        'Dispute workflow tracking',
        'Letter generation with review controls',
        'Dashboard visibility for client work',
      ]}
      workflow={[
        'Add a client and import credit-report information.',
        'Review extracted tradelines, inquiries, public records, and possible negative items.',
        'Generate organized correspondence and track each dispute round.',
        'Use dashboard views to monitor client activity, tasks, and follow-up.',
      ]}
      faqs={[
        { q: 'Who is this page for?', a: 'Credit professionals, financial coaches, mortgage professionals, real-estate professionals, tax professionals, consultants, and agencies managing credit-related workflows.' },
        { q: 'Does FixMy.Money perform disputes for my clients?', a: 'No. It is software for your workflow. Your business remains responsible for client communication, review, authorization, and compliance.' },
        { q: 'Does it support teams?', a: 'Current plans include team-member limits from the central pricing configuration, with higher-capacity options available on larger plans.' },
      ]}
    />
  );
}
