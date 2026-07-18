import React from 'react';
import AppLayout from '@/components/AppLayout';
import CreditReportImportContent from './components/CreditReportImportContent';

export const metadata = {
  title: 'Credit Report Import | FixMy.Money',
  description: 'Upload and parse client credit reports to identify dispute items.',
};

export default function CreditReportImportPage() {
  return (
    <AppLayout>
      <CreditReportImportContent />
    </AppLayout>
  );
}
