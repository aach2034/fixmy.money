import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthForm from '@/app/sign-up-login-screen/components/AuthForm';

export const metadata: Metadata = {
  title: 'Start $1 Trial | FixMy.Money',
  description: 'Create your FixMy.Money account and start your 14-day trial for $1.',
  alternates: { canonical: 'https://fixmy.money/signup' },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthForm defaultTab="register" />
    </Suspense>
  );
}
