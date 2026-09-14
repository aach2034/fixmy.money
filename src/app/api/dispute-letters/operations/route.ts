import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  authorizeLetterClient,
  deleteDraftLetters,
  LetterOperationError,
  markLettersMailed,
  type LetterRecordSource,
} from '@/lib/disputes/serverLetterOperations';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 8_192;
const MAX_LETTERS = 100;

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseRequest(value: unknown): {
  action: 'mark_mailed' | 'delete_drafts';
  source: LetterRecordSource;
  clientId: string;
  letterIds: string[];
} | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (body.action !== 'mark_mailed' && body.action !== 'delete_drafts') return null;
  if (body.source !== 'dispute_letters' && body.source !== 'generated_dispute_letters') return null;
  if (body.action === 'delete_drafts' && body.source !== 'dispute_letters') return null;
  if (!isUuid(body.clientId) || !Array.isArray(body.letterIds)) return null;
  const letterIds = [...new Set(body.letterIds)];
  if (letterIds.length === 0 || letterIds.length > MAX_LETTERS || !letterIds.every(isUuid)) return null;
  return { action: body.action, source: body.source, clientId: body.clientId, letterIds };
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ error: 'Cross-site letter changes are not allowed.' }, 403);
  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'Invalid letter operation.' }, 400);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid letter operation.' }, 400);
  }
  const body = parseRequest(parsed);
  if (!body) return json({ error: 'Invalid letter operation.' }, 400);

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'Authentication required.' }, 401);
    const admin = getAdminClient();
    const authorization = await authorizeLetterClient({
      admin,
      actorUserId: user.id,
      clientId: body.clientId,
    });
    if (body.action === 'delete_drafts') {
      const deletedIds = await deleteDraftLetters({ admin, authorization, letterIds: body.letterIds });
      return json({ status: 'deleted', deletedIds });
    }
    const letters = await markLettersMailed({
      admin,
      authorization,
      source: body.source,
      letterIds: body.letterIds,
    });
    return json({ status: 'sent', letters });
  } catch (error) {
    if (error instanceof LetterOperationError) return json({ error: error.message }, error.status);
    console.error('[LetterOperations] Operation failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return json({ error: 'Letter operation failed.' }, 500);
  }
}
