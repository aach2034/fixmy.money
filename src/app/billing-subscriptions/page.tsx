import React from 'react';
import AppLayout from '@/components/AppLayout';
import BillingContent from './components/BillingContent';

export default function BillingPage() {
  return (
    <AppLayout>
      <BillingContent paidCheckoutEnabled={process.env.NEW_PAID_CHECKOUT_ENABLED === 'true'} />
    </AppLayout>
  );
}
