import type { Metadata } from 'next';
import AcquisitionPage from '@/components/marketing/AcquisitionPage';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'Mortgage Partner Credit Report Software',
  description: 'Business software for mortgage professionals managing authorized client report reviews.',
  alternates: { canonical: canonicalUrl('/mortgage-partners') },
};

export default function MortgagePartnersPage() {
  return (
    <AcquisitionPage
      audience="mortgage"
      eyebrow="Mortgage partners"
      title="Organize client report reviews in your professional workspace."
      description="Software for your business to organize authorized client information, review possible reporting issues, and document follow-up. No new consumer subscriptions or mortgage-approval promises."
      primaryCta={{ label: 'Create Referral Link', href: '/affiliates?utm_source=mortgage_partners&utm_medium=partner_page&utm_campaign=mortgage_referrals' }}
      secondaryCta={{ label: 'Explore Business Plans', href: '/pricing' }}
      features={[
        'Client records for your professional team',
        'Referral codes and campaign tracking',
        'Client-authorized report review',
        'Dispute workflow organization',
        'Partner-friendly source attribution',
        'Human review before correspondence use',
      ]}
      workflow={[
        'Choose a business workspace and confirm authorized use.',
        'Obtain appropriate client authorization before importing report information.',
        'Your team reviews possible issues, correspondence, and follow-up.',
        'Attribution records the partner code and campaign through the reopening list and later activation.',
      ]}
      faqs={[
        { q: 'Does FixMy.Money promise mortgage approval?', a: 'No. FixMy.Money does not promise credit score changes, item deletions, or mortgage approval.' },
        { q: 'Can borrowers buy a personal account?', a: 'No. New subscriptions are business-only. Existing client-portal access provided through a business is separate from purchasing a subscription.' },
        { q: 'Can partners track referrals?', a: 'Referral and UTM parameters are captured as first-touch attribution when someone joins the reopening list.' },
      ]}
    />
  );
}
