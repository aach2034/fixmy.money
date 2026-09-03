import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    error: 'Saved raw-report repair previews are retired. Upload the original report again to reparse it locally.',
    errorCode: 'RAW_REPORT_REPAIR_RETIRED',
  }, {
    status: 410,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
