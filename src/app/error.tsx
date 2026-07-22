'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const message = `${error?.name || ''} ${error?.message || ''}`.toLowerCase();
  const isStaleAssetError =
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('dynamically imported module') ||
    message.includes('module script') ||
    message.includes('/assets/');

  React.useEffect(() => {
    if (!isStaleAssetError) return;
    const recoveryKey = `fixmy-asset-recovery:${window.location.pathname}`;
    if (window.sessionStorage.getItem(recoveryKey)) return;
    window.sessionStorage.setItem(recoveryKey, '1');
    window.location.reload();
  }, [isStaleAssetError]);

  const handleRetry = () => {
    if (isStaleAssetError) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-2 text-sm">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-slate-400 text-xs mb-6 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={14} /> Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            <Home size={14} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
