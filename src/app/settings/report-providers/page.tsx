import React from 'react';
import AppLayout from '@/components/AppLayout';
import ReportProvidersContent from './components/ReportProvidersContent';

export const metadata = {
  title: 'Report Provider Settings | FixMy.Money',
  description: 'Manage affiliate links for credit report providers',
};

export default function ReportProvidersPage() {
  return (
    <AppLayout>
      <ReportProvidersContent />
    </AppLayout>
  );
}
