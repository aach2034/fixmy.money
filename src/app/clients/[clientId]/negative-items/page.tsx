import AppLayout from '@/components/AppLayout';
import NegativeItemsContent from './components/NegativeItemsContent';

export default async function NegativeItemsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return (
    <AppLayout>
      <NegativeItemsContent clientId={clientId} />
    </AppLayout>
  );
}
