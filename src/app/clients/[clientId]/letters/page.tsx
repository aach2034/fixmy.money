import AppLayout from '@/components/AppLayout';
import ClientLettersContent from './components/ClientLettersContent';

export default async function ClientLettersPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return (
    <AppLayout>
      <ClientLettersContent clientId={clientId} />
    </AppLayout>
  );
}
