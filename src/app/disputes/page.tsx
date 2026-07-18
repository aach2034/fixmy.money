import AppLayout from '@/components/AppLayout';
import DisputesContent from './components/DisputesContent';

export const metadata = {
  title: 'Disputes | Fix My Money',
  description: 'Manage auto-generated disputes from credit report analysis',
};

export default function DisputesPage() {
  return (
    <AppLayout>
      <DisputesContent />
    </AppLayout>
  );
}
