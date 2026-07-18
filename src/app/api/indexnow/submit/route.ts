import { NextRequest, NextResponse } from 'next/server';
import {
  submitUrlsToIndexNow,
  submitAllPublicPages,
  getSubmissionLog,
  getSubmissionQueue,
  isPublicUrl,
} from '@/lib/indexnow/indexNowService';

// POST /api/indexnow/submit
// Body: { urls?: string[] } — omit urls to submit all public pages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const urls: string[] | undefined = body?.urls;

    let logs;
    if (urls && Array.isArray(urls) && urls.length > 0) {
      const filtered = urls.filter(isPublicUrl);
      if (filtered.length === 0) {
        return NextResponse.json(
          { error: 'All provided URLs are excluded (private/protected routes).' },
          { status: 400 }
        );
      }
      logs = await submitUrlsToIndexNow(filtered);
    } else {
      logs = await submitAllPublicPages();
    }

    const successCount = logs.filter((l) => l.success).length;
    const failCount = logs.filter((l) => !l.success).length;

    return NextResponse.json({
      submitted: logs.length,
      success: successCount,
      failed: failCount,
      logs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/indexnow/submit — returns submission log and queue
export async function GET() {
  return NextResponse.json({
    log: getSubmissionLog(),
    queue: getSubmissionQueue(),
  });
}
