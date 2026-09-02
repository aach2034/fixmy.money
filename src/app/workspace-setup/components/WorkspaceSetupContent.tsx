'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

export default function WorkspaceSetupContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <main className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <AppLogo size={36} />
          <div>
            <p className="font-bold text-lg text-foreground">Fix My Money</p>
            <p className="text-xs text-muted-foreground">Workspace settings</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 mb-6">
          <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" />
          <div>
            <h1 className="font-semibold text-foreground">Additional workspace management is temporarily unavailable</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Creating, deleting, or switching workspaces is disabled while workspace isolation and authorization are being verified. Your existing workspace data is unchanged.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
        >
          Return to Dashboard
          <ArrowRight size={16} />
        </button>
      </main>
    </div>
  );
}
