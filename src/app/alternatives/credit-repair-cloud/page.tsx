import type { Metadata } from 'next';
import ComparisonLandingPage from '@/components/ComparisonLandingPage';
import { comparisonPages } from '@/lib/comparisons/pages';
import { canonicalUrl } from '@/lib/seo/config';

const page = comparisonPages['credit-repair-cloud-alternative'];

export const metadata: Metadata = {
  title: 'Credit Repair Cloud Alternative',
  description: page.description,
  alternates: { canonical: canonicalUrl('/alternatives/credit-repair-cloud') },
};

export default function CreditRepairCloudAlternativeNestedPage() {
  return <ComparisonLandingPage page={page} />;
}
