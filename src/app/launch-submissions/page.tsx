import { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import LaunchSubmissionsContent from './components/LaunchSubmissionsContent';

export const metadata: Metadata = {
  title: 'Launch Submissions | FixMy.Money',
  description: 'Manage directory submissions, outreach, and distribution for FixMy.Money launch.',
  robots: { index: false, follow: false },
};

export default function LaunchSubmissionsPage() {
  return (
    <AppLayout>
      <LaunchSubmissionsContent />
    </AppLayout>
  );
}
