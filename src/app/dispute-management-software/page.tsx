import type { Metadata } from 'next';
import AcquisitionPage from '@/components/marketing/AcquisitionPage';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'Dispute Management Software',
  description: 'Manage credit-report dispute workflows, letters, evidence, client activity, and follow-up from one organized software workspace.',
  alternates: { canonical: canonicalUrl('/dispute-management-software') },
};

export default function DisputeManagementSoftwarePage() {
  return (
    <AcquisitionPage
      audience="professional"
      eyebrow="Commercial guide"
      title="Dispute-management software for organized credit-report workflows."
      description="FixMy.Money helps consumers and professionals organize potential reporting issues, supporting information, dispute correspondence, and response tracking without promising a specific investigation result."
      primaryCta={{ label: 'Start $1 Trial', href: '/signup?plan=professional&utm_source=dispute_management&utm_medium=commercial_page&utm_campaign=software_trial' }}
      secondaryCta={{ label: 'Compare Plans', href: '/pricing' }}
      features={[
        'Structured dispute rounds and activity tracking',
        'Source-linked report review',
        'Letter generation and organization',
        'Client and workspace views',
        'Response and deadline visibility',
        'Audit-friendly workflow history',
      ]}
      workflow={[
        'Identify the account, inquiry, or record that needs review.',
        'Attach or summarize the supporting information behind the issue.',
        'Generate correspondence for review and approval.',
        'Track delivery, responses, and follow-up activity in the same workspace.',
      ]}
      faqs={[
        { q: 'Is dispute-management software the same as a credit repair service?', a: 'No. The software organizes workflows. Users decide what to review, verify, send, and track.' },
        { q: 'Can professionals manage clients?', a: 'Yes. Professional plans support client management, report importing, dispute workflows, and dashboard views.' },
        { q: 'Can individuals use it?', a: 'Yes. Individuals can use the consumer path to review and manage their own credit-report dispute activity.' },
      ]}
    />
  );
}
