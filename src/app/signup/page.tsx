import type { Metadata } from 'next';
import ReopeningNotice from '@/components/ReopeningNotice';

export const metadata: Metadata = {
  title: 'Reopening October 25, 2026 | FixMy.Money',
  description: 'Join the FixMy.Money reopening list and reserve one month free when we reopen October 25, 2026.',
  alternates: { canonical: 'https://fixmy.money/signup' },
};

export default function SignupPage() {
  return (
    <ReopeningNotice standalone />
  );
}
