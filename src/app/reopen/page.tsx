import type { Metadata } from 'next';
import ReopeningNotice from '@/components/ReopeningNotice';

export const metadata: Metadata = {
  title: 'Reopening September 30, 2026 | FixMy.Money',
  description: 'Reserve your place and receive your first month free when FixMy.Money reopens September 30, 2026.',
  alternates: { canonical: 'https://fixmy.money/reopen' },
};

export default function ReopenPage() {
  return <ReopeningNotice standalone />;
}
