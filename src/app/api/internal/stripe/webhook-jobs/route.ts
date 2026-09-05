import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  createSupabaseDurableWebhookStore,
  runClaimedEmail,
  runClaimedWebhookEvent,
} from '@/lib/stripe/durableWebhook';
import {
  createWebhookBusinessDependencies,
  processStripeWebhookBusinessEvent,
} from '@/lib/stripe/webhookProcessor';

const MAX_JOBS_PER_RUN = 20;

function hasWorkerAuthorization(req: NextRequest): boolean {
  const configured = process.env.STRIPE_WEBHOOK_WORKER_SECRET;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!configured || configured.length < 32 || !provided) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(req: NextRequest) {
  if (!hasWorkerAuthorization(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const store = createSupabaseDurableWebhookStore(admin);
  const dependencies = createWebhookBusinessDependencies(admin, store);
  const input = await req.json().catch(() => ({})) as { stripeEventId?: unknown };
  const replayEventId = typeof input.stripeEventId === 'string' && /^evt_[A-Za-z0-9_]+$/.test(input.stripeEventId)
    ? input.stripeEventId
    : null;
  if (input.stripeEventId !== undefined && !replayEventId) {
    return NextResponse.json({ error: 'Invalid Stripe event ID' }, { status: 400 });
  }
  if (replayEventId) await store.replay(replayEventId);
  let webhookSucceeded = 0;
  let webhookFailed = 0;
  let emailSucceeded = 0;
  let emailFailed = 0;

  for (let index = 0; index < (replayEventId ? 1 : MAX_JOBS_PER_RUN); index += 1) {
    try {
      const result = await runClaimedWebhookEvent(
        store,
        event => processStripeWebhookBusinessEvent(event, dependencies),
        replayEventId || undefined
      );
      if (result === 'deferred') break;
      webhookSucceeded += 1;
    } catch {
      webhookFailed += 1;
    }
  }

  for (let index = 0; index < MAX_JOBS_PER_RUN; index += 1) {
    try {
      const result = await runClaimedEmail(store, sendTransactionalEmail);
      if (result === 'deferred') break;
      emailSucceeded += 1;
    } catch {
      emailFailed += 1;
    }
  }

  const response = {
    processed: {
      webhooks: { succeeded: webhookSucceeded, failed: webhookFailed },
      emails: { succeeded: emailSucceeded, failed: emailFailed },
    },
  };
  return NextResponse.json(response, {
    status: webhookFailed + emailFailed > 0 ? 503 : 200,
  });
}
