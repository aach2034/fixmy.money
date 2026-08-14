import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    errorCode: 'OPENAI_OCR_DISABLED',
    error: 'OpenAI image OCR is disabled. Use the dedicated page-level OCR pipeline.',
    openAiGenerationCount: 0,
  }, { status: 410 });
}
