import type { Metadata } from 'next';
import FreeToolsContent from './FreeToolsContent';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'Free Credit Report Tools',
  description: 'Free credit utilization, FCRA deadline, debt validation, credit-report checklist, and dispute-letter tools from FixMy.Money.',
  alternates: { canonical: canonicalUrl('/tools') },
};

export default function ToolsPage() {
  return <FreeToolsContent />;
}
