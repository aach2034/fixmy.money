import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthForm from '@/app/sign-up-login-screen/components/AuthForm';

export const metadata: Metadata = {
  title: 'Reset Password | FixMy.Money',
  description: 'Reset your FixMy.Money account password.',
  alternates: { canonical: 'https://fixmy.money/forgot-password' },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthForm defaultTab="forgot" />
    </Suspense>
  );
}
