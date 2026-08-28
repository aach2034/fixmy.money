import type { Metadata } from 'next';
import AcquisitionPage from '@/components/marketing/AcquisitionPage';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'Credit Report Software for Individuals',
  description: 'Understand your credit report, identify potential reporting issues, generate dispute correspondence, and track activity yourself.',
  alternates: { canonical: canonicalUrl('/individuals') },
  openGraph: {
    title: 'Credit Report Software for Individuals | FixMy.Money',
    description: 'Understand your credit report. Find potential issues. Take action yourself.',
    url: canonicalUrl('/individuals'),
    siteName: 'FixMy.Money',
    type: 'website',
  },
};

export default function IndividualsPage() {
  return (
    <AcquisitionPage
      audience="consumer"
      eyebrow="For individuals"
      title="Understand your credit report. Find potential issues. Take action yourself."
      description="FixMy.Money gives consumers a guided software workspace for reviewing credit reports, organizing possible reporting issues, generating dispute correspondence, and tracking dispute activity."
      primaryCta={{ label: 'Analyze My Credit Report', href: '/signup?plan=starter&utm_source=individuals&utm_medium=landing_page&utm_campaign=consumer_acquisition' }}
      secondaryCta={{ label: 'See How It Works', href: '#how-it-works' }}
      features={[
        'Upload and analyze credit report data',
        'Identify possible reporting issues for review',
        'Generate editable dispute letters from your facts',
        'Track dispute rounds, dates, and responses',
        'Organize supporting information',
        'Keep the workflow private and structured',
      ]}
      workflow={[
        'Upload or paste your credit-report information.',
        'Review possible issues such as duplicates, wrong balances, late payments, or unfamiliar accounts.',
        'Generate correspondence you can review, edit, and send yourself.',
        'Track activity and responses so each next step is organized.',
      ]}
      faqs={[
        { q: 'Is FixMy.Money a credit repair service?', a: 'No. FixMy.Money is software. You review your own information, decide what action to take, and control any correspondence.' },
        { q: 'Does it promise score increases or deletions?', a: 'No. The software helps organize possible credit-report issues and dispute workflows. It does not promise outcomes.' },
        { q: 'Can I use it without a professional?', a: 'Yes. The individual path is designed for consumers who want to understand and manage their own report workflow.' },
      ]}
    />
  );
}
