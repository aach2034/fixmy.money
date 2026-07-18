import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DisputeWizardContent from './components/DisputeWizardContent';

export const metadata = {
  title: 'Dispute Wizard | FixMy.Money',
  description: 'Step-by-step guided dispute workflow for credit repair agencies.',
};

export default function DisputeWizardPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
        <DisputeWizardContent />
      </Suspense>
    </AppLayout>
  );
}
