import { NextResponse } from 'next/server';

const TEMPORARILY_UNAVAILABLE = {
  error: 'AI credit-report analysis is temporarily unavailable. Your report was not sent to an AI provider.',
  code: 'CREDIT_REPORT_AI_TEMPORARILY_DISABLED',
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
