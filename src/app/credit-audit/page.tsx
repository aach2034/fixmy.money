import React from 'react';
import AppLayout from '@/components/AppLayout';
import CreditAuditContent from './components/CreditAuditContent';

export const metadata = {
  title: 'Credit Audit Tool | FixMy.Money',
  description: 'One-click client credit audit with bureau-by-bureau comparison and dispute strategy.',
};

export default function CreditAuditPage() {
  return (
    <AppLayout>
      <CreditAuditContent />
    </AppLayout>
  );
}
