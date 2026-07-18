import type { Metadata } from 'next';
import DemoModeContent from './components/DemoModeContent';

export const metadata: Metadata = {
  title: 'Interactive Demo | FixMy.Money — Credit Repair Software',
  description: 'Explore FixMy.Money with sample data. No account or credit card required. See client management, disputes, billing, and analytics in action.',
  alternates: { canonical: 'https://fixmy.money/demo-mode' },
  robots: { index: false, follow: false },
};

export default function DemoModePage() {
  return <DemoModeContent />;
}
