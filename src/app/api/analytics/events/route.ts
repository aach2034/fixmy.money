import { NextRequest, NextResponse } from 'next/server';
import {
  PRODUCT_ANALYTICS_EVENTS,
  logProductAnalyticsEvent,
  type ProductAnalyticsEventName,
} from '@/lib/analytics/server';
import { createClient } from '@/lib/supabase/server';

const CLIENT_EVENT_NAMES = new Set<ProductAnalyticsEventName>([
  'onboarding_started',
  'onboarding_completed',
  'credit_report_import_started',
  'credit_report_import_completed',
  'credit_audit_viewed',
  'dispute_wizard_started',
  'dispute_created',
  'letter_generated',
  'checkout_started',
]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ recorded: false }, { status: 401 });

  const body = await request.json().catch(() => null) as null | {
    event_name?: string;
    properties?: Record<string, unknown>;
    event_id?: string;
  };
  const eventName = body?.event_name as ProductAnalyticsEventName;
  if (!PRODUCT_ANALYTICS_EVENTS.includes(eventName) || !CLIENT_EVENT_NAMES.has(eventName)) {
    return NextResponse.json({ error: 'Unsupported analytics event.' }, { status: 400 });
  }

  try {
    const result = await logProductAnalyticsEvent({
      eventName,
      userId: user.id,
      properties: body?.properties,
      dedupeKey: body?.event_id ? `client:${user.id}:${body.event_id.slice(0, 80)}` : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Analytics] Server event write failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ recorded: false }, { status: 500 });
  }
}
