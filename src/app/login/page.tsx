import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthForm from '@/app/sign-up-login-screen/components/AuthForm';

export const metadata: Metadata = {
  title: 'Sign In | FixMy.Money',
  description: 'Sign in to your FixMy.Money account.',
  alternates: { canonical: 'https://fixmy.money/login' },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthForm defaultTab="login" />
    </Suspense>
  );
}
