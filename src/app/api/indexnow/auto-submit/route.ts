import { NextResponse } from 'next/server';
import { submitAllPublicPages } from '@/lib/indexnow/indexNowService';

// GET /api/indexnow/auto-submit
// Called once on server startup via layout to submit all public pages
export async function GET() {
  try {
    const logs = await submitAllPublicPages();
    const successCount = logs.filter((l) => l.success).length;
    return NextResponse.json({
      message: 'Auto-submission complete',
      submitted: logs.length,
      success: successCount,
      failed: logs.length - successCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
