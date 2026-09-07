import { NextResponse } from 'next/server';
import { signupClosedPayload } from '@/lib/signup/closure';

export async function POST() {
  return NextResponse.json(signupClosedPayload(), {
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
  });
}
