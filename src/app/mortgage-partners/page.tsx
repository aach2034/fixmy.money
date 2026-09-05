import type { Metadata } from 'next';
import AcquisitionPage from '@/components/marketing/AcquisitionPage';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'Mortgage Partner Credit Report Software',
  description: 'A compliance-friendly borrower handoff path for mortgage professionals whose applicants need to review possible credit-report issues.',
  alternates: { canonical: canonicalUrl('/mortgage-partners') },
};

export default function MortgagePartnersPage() {
  return (
    <AcquisitionPage
      audience="mortgage"
      eyebrow="Mortgage partners"
      title="Help more borrowers become mortgage-ready."
      description="Give applicants a software path to analyze reports, understand possible reporting issues, organize dispute correspondence, and track progress without implying assured mortgage approval."
      primaryCta={{ label: 'Create Referral Link', href: '/affiliates?utm_source=mortgage_partners&utm_medium=partner_page&utm_campaign=mortgage_referrals' }}
      secondaryCta={{ label: 'Send Borrowers Here', href: '/individuals?utm_source=mortgage_partner&utm_medium=referral&utm_campaign=borrower_handoff' }}
      features={[
        'Borrower handoff flow for report review',
        'Referral codes and campaign tracking',
        'Credit-report analyzer CTA for applicants',
        'Dispute workflow organization',
        'Partner-friendly source attribution',
        'Compliance-safe mortgage-readiness language',
      ]}
      workflow={[
        'Share a referral URL with borrowers who need a self-directed report workflow.',
        'Borrowers upload or paste report information and review potential issues.',
        'FixMy.Money helps them organize letters and track dispute activity.',
        'Attribution records the partner code and campaign through signup and checkout.',
      ]}
      faqs={[
        { q: 'Does FixMy.Money promise mortgage approval?', a: 'No. FixMy.Money does not promise credit score changes, item deletions, or mortgage approval.' },
        { q: 'Can borrowers use it themselves?', a: 'Yes. The borrower remains in control of report review, evidence, correspondence, and follow-up.' },
        { q: 'Can partners track referrals?', a: 'Referral and UTM parameters are captured as first-touch attribution and carried through signup and checkout metadata.' },
      ]}
    />
  );
}
