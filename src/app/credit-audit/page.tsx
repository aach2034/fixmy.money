import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import CreditAuditContent from './components/CreditAuditContent';

export const metadata = {
  title: 'Credit Audit Tool | FixMy.Money',
  description: 'One-click client credit audit with bureau-by-bureau comparison and dispute strategy.',
};

export default function CreditAuditPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="card min-h-64 animate-pulse" aria-label="Loading credit audit" />}>
        <CreditAuditContent />
      </Suspense>
    </AppLayout>
  );
}
