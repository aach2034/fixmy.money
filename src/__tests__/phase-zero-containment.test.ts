import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POST as genericAiPost } from '@/app/api/ai/chat-completion/route';
import { GET as aiUsageGet, POST as aiUsagePost } from '@/app/api/ai/usage/route';
import { POST as creditReportAiPost } from '@/app/api/credit-report/analyze/route';
import { POST as restorePurchasePost } from '@/app/api/stripe/restore-purchase/route';

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

async function expectUnavailable(
  response: Response,
  expectedCode: string,
  forbiddenValue = 'synthetic-sensitive-report-value',
) {
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const payload = await response.json();
  expect(payload.code).toBe(expectedCode);
  expect(JSON.stringify(payload)).not.toContain(forbiddenValue);
}

describe('Phase 0 server containment', () => {
  it('fails the generic AI proxy closed without accepting client model or credentials', async () => {
    await expectUnavailable(await genericAiPost(), 'AI_TEMPORARILY_DISABLED');
    const route = source('src/app/api/ai/chat-completion/route.ts');
    expect(route).not.toMatch(/request\.json|provider|model|api_key|completion\(/);
  });

  it('fails raw credit-report AI analysis closed without reading or transmitting a file', async () => {
    await expectUnavailable(await creditReportAiPost(), 'CREDIT_REPORT_AI_TEMPORARILY_DISABLED');
    const route = source('src/app/api/credit-report/analyze/route.ts');
    expect(route).not.toMatch(/request\.json|fileData|getChatCompletion|console\./);
  });

  it('disables AI usage mutations and quota claims', async () => {
    await expectUnavailable(await aiUsageGet(), 'AI_TEMPORARILY_DISABLED');
    await expectUnavailable(await aiUsagePost(), 'AI_TEMPORARILY_DISABLED');
    const route = source('src/app/api/ai/usage/route.ts');
    expect(route).not.toMatch(/request\.json|ai_usage_events|PLAN_AI_LIMITS|getAdminClient/);
  });

  it('fails purchase restoration closed without Stripe or entitlement access', async () => {
    const response = await restorePurchasePost();
    expect(response.status).toBe(410);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).code).toBe('PURCHASE_RESTORATION_REMOVED');
    const route = source('src/app/api/stripe/restore-purchase/route.ts');
    expect(route).not.toMatch(/Stripe|checkout\.sessions|subscriptions\.list|user_profiles|getAdminClient/);
  });
});

describe('Phase 0 interface containment', () => {
  it('does not retain a client-document upload or public URL path', () => {
    const portal = source('src/app/client-portal/components/ClientPortalDashboardContent.tsx');
    expect(portal).not.toContain('.storage');
    expect(portal).not.toContain('getPublicUrl');
    expect(portal).not.toMatch(/from\(['"]client_documents['"]\)\.insert/);
    expect(portal).toContain('Document upload temporarily unavailable');
  });

  it('does not expose production demo credentials', () => {
    const login = source('src/app/client-portal/components/ClientPortalLoginContent.tsx');
    expect(login).not.toContain('client@demo.com');
    expect(login).not.toContain('client123');
    expect(login).not.toContain('Demo Access');
  });

  it('does not simulate Stripe Connect success', () => {
    const onboarding = source('src/app/onboarding/components/OnboardingContent.tsx');
    expect(onboarding).not.toContain('Stripe connected successfully');
    expect(onboarding).not.toContain('setStripeConnected');
    expect(onboarding).not.toContain('Connect Stripe Account');
    expect(onboarding).toContain('Stripe Connect is not available yet');
  });

  it('removes purchase restoration and workspace-switching links', () => {
    const checkout = source('src/app/checkout/components/CheckoutContent.tsx');
    const sidebar = source('src/components/Sidebar.tsx');
    expect(checkout).not.toContain("fetch('/api/stripe/restore-purchase'");
    expect(sidebar).not.toContain('href="/workspace-setup"');
  });

  it('does not retain automatic AI letter generation in report import', () => {
    const reportImport = source('src/app/credit-report-import/components/CreditReportImportContent.tsx');
    expect(reportImport).not.toContain("fetch('/api/ai/chat-completion'");
    expect(reportImport).not.toContain('shouldCreateAutomaticDrafts');
    expect(reportImport).not.toContain('auto_generated: true');
  });
});
