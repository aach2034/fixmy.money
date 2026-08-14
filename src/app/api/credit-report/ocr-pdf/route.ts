import { NextResponse } from 'next/server';

const disabledResponse = () => NextResponse.json({
  success: false,
  errorCode: 'OPENAI_OCR_DISABLED',
  error: 'Raw PDF OCR is disabled. Credit reports are processed page by page with dedicated OCR.',
  openAiGenerationCount: 0,
}, { status: 410 });

export async function POST() {
  return disabledResponse();
}

export async function PUT() {
  return disabledResponse();
}
