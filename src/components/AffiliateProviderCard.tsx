'use client';
import React from 'react';
import { ExternalLink, Star, AlertTriangle } from 'lucide-react';
import { ReportProvider, trackAffiliateClick } from '@/lib/affiliates/reportProviders';

interface AffiliateProviderCardProps {
  provider: ReportProvider;
  sourcePage: string;
  clientId?: string | null;
  agencyId?: string | null;
  userId?: string | null;
  onUploadClick?: (providerKey: string) => void;
  showUploadButton?: boolean;
  showParseButton?: boolean;
  onParseClick?: (providerKey: string) => void;
  compact?: boolean;
}

export default function AffiliateProviderCard({
  provider,
  sourcePage,
  clientId,
  agencyId,
  userId,
  onUploadClick,
  showUploadButton = false,
  showParseButton = false,
  onParseClick,
  compact = false,
}: AffiliateProviderCardProps) {
  const handleGetReport = () => {
    if (!provider.affiliateUrl) return;
    trackAffiliateClick({
      provider: provider.key,
      sourcePage,
      clientId,
      agencyId,
      userId,
    });
    window.open(provider.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`border border-border rounded-xl bg-card overflow-hidden ${provider.isPreferred ? 'ring-2 ring-primary/30' : ''}`}>
      {provider.isPreferred && (
        <div className="bg-primary/10 px-4 py-1.5 flex items-center gap-1.5">
          <Star size={12} className="text-primary fill-primary" />
          <span className="text-xs font-bold text-primary">Recommended Provider</span>
        </div>
      )}
      <div className={`p-4 space-y-3 ${compact ? 'p-3 space-y-2' : ''}`}>
        <div>
          <h3 className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}>{provider.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{provider.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {provider.affiliateUrl ? (
            <button
              onClick={handleGetReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <ExternalLink size={12} />
              Get {provider.name} Report
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold cursor-not-allowed">
              <ExternalLink size={12} />
              Link not configured
            </span>
          )}
          {showUploadButton && onUploadClick && (
            <button
              onClick={() => onUploadClick(provider.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Upload {provider.name} Report
            </button>
          )}
          {showParseButton && onParseClick && (
            <button
              onClick={() => onParseClick(provider.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Parse {provider.name} Report
            </button>
          )}
        </div>

        {provider.affiliateUrl && (
          <p className="text-2xs text-muted-foreground leading-relaxed">
            After signing up, return here to upload your PDF report.
          </p>
        )}
      </div>
    </div>
  );
}

interface AffiliateDisclosureProps {
  text?: string;
  className?: string;
}

export function AffiliateDisclosure({ text, className = '' }: AffiliateDisclosureProps) {
  const defaultText = 'Disclosure: FixMy.Money or your credit specialist may receive compensation if you sign up through this link. You are not required to use this provider. You may upload a report from another supported provider.';
  return (
    <div className={`flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
      <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700 leading-relaxed">{text ?? defaultText}</p>
    </div>
  );
}
