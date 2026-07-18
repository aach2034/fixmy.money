'use client';
import React from 'react';
import AppLayout from '@/components/AppLayout';
import ClientManagementContent from './components/ClientManagementContent';
import ClientRiskContent from './components/ClientRiskContent';
import { useState } from 'react';
import { Users, ShieldAlert } from 'lucide-react';

export default function ClientManagementPage() {
  const [tab, setTab] = useState<'clients' | 'risk'>('clients');

  return (
    <AppLayout>
      <div className="border-b border-border bg-card px-6">
        <div className="flex items-center gap-1 max-w-screen-2xl mx-auto">
          {[
            { id: 'clients', label: 'All Clients', icon: Users },
            { id: 'risk', label: 'Risk Scoring', icon: ShieldAlert },
          ].map((t) => {
            const TIcon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'clients' | 'risk')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TIcon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === 'clients' ? <ClientManagementContent /> : <ClientRiskContent />}
    </AppLayout>
  );
}