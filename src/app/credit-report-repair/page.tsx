import AppLayout from '@/components/AppLayout';
import CreditReportRepairContent from './CreditReportRepairContent';

export const metadata = {
  title: 'Repair Saved Credit Reports | FixMy.Money',
};

export default function CreditReportRepairPage() {
  return (
    <AppLayout>
      <CreditReportRepairContent />
    </AppLayout>
  );
}
