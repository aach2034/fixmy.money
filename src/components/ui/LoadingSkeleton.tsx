import React from 'react';

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}

export function SkeletonText({ width = 'w-full', className = '' }: { width?: string; className?: string }) {
  return <div className={`animate-pulse bg-muted rounded h-4 ${width} ${className}`} />;
}

export function SkeletonTableRow({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`sk-col-${i}`} className="px-3 py-3">
          <div className="animate-pulse bg-muted rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="app-page page-stack" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={`sk-card-${i}`} className={`h-28 ${i === 0 ? 'lg:col-span-2' : ''}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}
