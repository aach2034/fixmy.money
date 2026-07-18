import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DisputeLetterContent from './components/DisputeLetterContent';

export default function DisputeLetterPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <DisputeLetterContent />
      </Suspense>
    </AppLayout>
  );
}