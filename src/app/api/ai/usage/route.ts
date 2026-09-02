import { NextResponse } from 'next/server';

const TEMPORARILY_UNAVAILABLE = {
  error: 'AI features and usage tracking are temporarily unavailable.',
  code: 'AI_TEMPORARILY_DISABLED',
} as const;

function unavailable() {
  return NextResponse.json(TEMPORARILY_UNAVAILABLE, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Retry-After': '3600',
    },
  });
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
