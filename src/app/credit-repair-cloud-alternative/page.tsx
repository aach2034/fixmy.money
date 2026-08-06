import type { Metadata } from 'next';
import ComparisonLandingPage from '@/components/ComparisonLandingPage';
import { comparisonPages } from '@/lib/comparisons/pages';

export const metadata: Metadata = {
  title: 'Credit Repair Cloud Alternative',
  description: comparisonPages['credit-repair-cloud-alternative'].description,
  alternates: { canonical: 'https://fixmy.money/credit-repair-cloud-alternative' },
};

export default function CreditRepairCloudAlternativePage() {
  return <ComparisonLandingPage page={comparisonPages['credit-repair-cloud-alternative']} />;
}
