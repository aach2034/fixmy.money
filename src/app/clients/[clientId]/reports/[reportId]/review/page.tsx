import AppLayout from '@/components/AppLayout';
import ReportReviewContent from './components/ReportReviewContent';

export default async function ReportReviewPage({ params }: { params: Promise<{ clientId: string; reportId: string }> }) {
  const { clientId, reportId } = await params;
  return (
    <AppLayout>
      <ReportReviewContent clientId={clientId} reportId={reportId} />
    </AppLayout>
  );
}
