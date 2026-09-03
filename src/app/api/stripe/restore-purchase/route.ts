import { NextResponse } from 'next/server';

const RESTORATION_REMOVED = {
  activated: false,
  code: 'PURCHASE_RESTORATION_REMOVED',
  message: 'Automatic purchase restoration has been permanently removed. No account changes were made. Contact support if checkout completed but access is missing.',
} as const;

export async function POST() {
  return NextResponse.json(RESTORATION_REMOVED, {
    status: 410,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
