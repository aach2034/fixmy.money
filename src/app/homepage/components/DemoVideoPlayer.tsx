'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics';

const VIDEO_URL =
  'https://euwpcnaioorzkhmwfnjn.supabase.co/storage/v1/object/public/creative-assets/fcc6e6b6-b858-4ac1-9180-324a4abaeaad/videos/video-1781845962176-931gbyjy0b9.mp4';

interface DemoVideoPlayerProps {
  placement: 'hero' | 'features' | 'business_owner' | 'pricing';
  showTrialCta?: boolean;
  showDemoCta?: boolean;
  onTrialClick?: () => void;
  onDemoClick?: () => void;
  /** @deprecated use showTrialCta / onTrialClick */
  ctaLabel?: string;
  /** @deprecated use onTrialClick */
  onCtaClick?: () => void;
}

export default function DemoVideoPlayer({
  placement,
  showTrialCta,
  showDemoCta,
  onTrialClick,
  onDemoClick,
  ctaLabel,
  onCtaClick,
}: DemoVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackedRef = useRef<Set<string>>(new Set());

  const fireEvent = useCallback(
    (eventName: string) => {
      if (trackedRef.current.has(eventName)) return;
      trackedRef.current.add(eventName);
      trackEvent(eventName, {
        event_category: 'video',
        video_placement: placement,
        video_url: VIDEO_URL,
      });
    },
    [placement],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => fireEvent('video_start');

    const onTimeUpdate = () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      if (pct >= 25) fireEvent('video_25');
      if (pct >= 50) fireEvent('video_50');
      if (pct >= 75) fireEvent('video_75');
    };

    const onEnded = () => fireEvent('video_complete');

    video.addEventListener('play', onPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
    };
  }, [fireEvent]);

  const handleTrialClick = () => {
    trackEvent('trial_click_after_video', {
      event_category: 'conversion',
      video_placement: placement,
    });
    if (onTrialClick) {
      onTrialClick();
    } else if (onCtaClick) {
      onCtaClick();
    }
  };

  const handleDemoClick = () => {
    trackEvent('demo_click_after_video', {
      event_category: 'conversion',
      video_placement: placement,
    });
    onDemoClick?.();
  };

  // Legacy support: if ctaLabel passed but no new props, treat as trial CTA
  const legacyCtaActive = !!(ctaLabel && !showTrialCta && !showDemoCta);
  const showCtaStrip = showTrialCta || showDemoCta || legacyCtaActive;

  return (
    <div className="relative w-full">
      {/* Outer blue glow */}
      <div
        className="absolute -inset-2 rounded-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.18) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />

      {/* Glassmorphism card — exact spec */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(17,24,39,0.75)',
          border: '1px solid rgba(37,99,235,0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 25px 80px rgba(37,99,235,0.15)',
        }}
      >
        {/* Browser chrome bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: 'rgba(17,24,39,0.9)', borderColor: 'rgba(37,99,235,0.2)' }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 mx-4">
            <div
              className="rounded-md px-3 py-1 text-xs text-slate-400 max-w-xs mx-auto text-center"
              style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}
            >
              app.fixmy.money/dashboard
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Live Demo</span>
          </div>
        </div>

        {/* Video */}
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
            style={{ background: '#0D1B2A' }}
            aria-label="FixMy.Money platform demo — evidence-first agency workflow with client management, human-approved disputes, and billing tools"
          />
          {/* Inner blue glow overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 40px rgba(37,99,235,0.08)' }}
          />
        </div>

        {/* CTA strip */}
        {showCtaStrip && (
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t"
            style={{ background: 'rgba(17,24,39,0.9)', borderColor: 'rgba(37,99,235,0.2)' }}
          >
            <p className="text-sm text-slate-300 font-medium text-center sm:text-left">
              Ready to run your credit repair business from one platform?
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {(showTrialCta || legacyCtaActive) && (
                <button
                  type="button"
                  onClick={handleTrialClick}
                  className="inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
                >
                  {ctaLabel || 'Start $1 Trial'}
                </button>
              )}
              {showDemoCta && (
                <button
                  type="button"
                  onClick={handleDemoClick}
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-white/20 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Book Demo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
