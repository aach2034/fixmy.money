import { NextResponse } from 'next/server';

const RESTORATION_DISABLED = {
  activated: false,
  code: 'PURCHASE_RESTORATION_DISABLED',
  message: 'Automatic purchase restoration is temporarily unavailable. No account changes were made. Please contact support if your checkout completed but access is missing.',
} as const;

export async function POST() {
  return NextResponse.json(RESTORATION_DISABLED, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Retry-After': '3600',
    },
  });
}
