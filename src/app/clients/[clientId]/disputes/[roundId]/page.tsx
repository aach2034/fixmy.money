import AppLayout from '@/components/AppLayout';
import DisputeRoundContent from './components/DisputeRoundContent';

export default async function DisputeRoundPage({ params }: { params: Promise<{ clientId: string; roundId: string }> }) {
  const { clientId, roundId } = await params;
  return (
    <AppLayout>
      <DisputeRoundContent clientId={clientId} roundId={roundId} />
    </AppLayout>
  );
}
