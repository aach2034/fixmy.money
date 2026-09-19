import type { Metadata } from 'next';
import ReopeningNotice from '@/components/ReopeningNotice';

export const metadata: Metadata = {
  title: 'Reopening September 30, 2026 | FixMy.Money',
  description: 'Join the FixMy.Money reopening list and reserve one month free when we reopen September 30, 2026.',
  alternates: { canonical: 'https://fixmy.money/signup' },
};

export default function SignupPage() {
  return (
    <ReopeningNotice standalone />
  );
}
