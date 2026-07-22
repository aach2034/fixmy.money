'use client';

import React from 'react';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  const message = `${error?.name || ''} ${error?.message || ''}`.toLowerCase();
  const isStaleAssetError =
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('dynamically imported module') ||
    message.includes('module script') ||
    message.includes('/assets/');

  React.useEffect(() => {
    if (!isStaleAssetError) return;
    const recoveryKey = `fixmy-global-asset-recovery:${window.location.pathname}`;
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
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={28} color="#dc2626" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#64748b', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              An unexpected error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleRetry}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <RefreshCw size={14} /> Try Again
              </button>
              <a
                href="/"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#374151', border: '1px solid #e2e8f0', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
              >
                <Home size={14} /> Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
