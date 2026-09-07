import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeStaffClient } from '@/lib/workspaces/authorization';

const MAX_ITEMS = 500;
const MAX_BODY_BYTES = 2_000_000;

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const raw = await request.text();
    if (raw.length === 0 || raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 });
    }
    const body = JSON.parse(raw) as Record<string, unknown>;
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    const report = body.report;
    const items = body.items;
    const clientUpdates = body.clientUpdates;
    if (!clientId || !report || typeof report !== 'object' || !Array.isArray(items)
        || items.length > MAX_ITEMS || !clientUpdates || typeof clientUpdates !== 'object') {
      return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const authorization = await authorizeStaffClient(admin, user.id, clientId, 'write');
    if (!authorization) return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 });

    const commitKey = createHash('sha256')
      .update(JSON.stringify({ clientId, report, items }))
      .digest('hex');
    const { data, error } = await admin.rpc('save_credit_report_atomic_server', {
      p_actor_id: user.id,
      p_workspace_id: authorization.workspaceId,
      p_client_id: authorization.clientId,
      p_commit_key: commitKey,
      p_report: report,
      p_items: items,
      p_client_updates: clientUpdates,
    });
    if (error) {
      console.error('[AtomicReportSave] Transaction failed', { code: error.code });
      return NextResponse.json({ error: 'Report save failed; no partial data was committed' }, { status: 500 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.report_id) {
      return NextResponse.json({ error: 'Report save failed; no partial data was committed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, reportId: result.report_id, savedCount: result.saved_count });
  } catch {
    return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 });
  }
}
