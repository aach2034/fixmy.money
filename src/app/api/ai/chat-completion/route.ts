import { NextResponse } from 'next/server';

const TEMPORARILY_UNAVAILABLE = {
  error: 'AI features are temporarily unavailable while additional privacy and usage controls are completed.',
  code: 'AI_TEMPORARILY_DISABLED',
} as const;

export async function POST() {
  return NextResponse.json(TEMPORARILY_UNAVAILABLE, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Retry-After': '3600',
    },
  });
}
