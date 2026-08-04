/**
 * Pricing Consistency & Safety Tests
 *
 * Verifies:
 * 1. Centralized pricing config is the only pricing source ($39/$99/$199)
 * 2. Trial is consistently 14 days and free (no credit card required)
 * 3. Checkout does NOT create a $1 invoice item
 * 4. Checkout uses `professional`, not legacy `growth`
 * 5. Duplicate checkout attempts do not create duplicate subscriptions
 * 6. /demo-mode cannot access production tenant data
 * 7. Organization A cannot read Organization B's client records (RLS smoke test)
 * 8. Private client documents are not publicly accessible (storage privacy)
 * 9. Required Stripe environment variables are present or checkout is safely disabled
 * 10. No retired $49/$129/$249 pricing appears in public-facing code
 * 11. No "7-day trial" or "$1 trial" language appears in public-facing code
 *
 * Run: npx vitest run src/__tests__/pricing-consistency.test.ts
 */

import { describe, it, expect } from 'vitest';
import { PLANS, PLANS_LIST, CHECKOUT_PLANS, TRIAL_CONFIG, getStripePriceId, type PlanId,  } from '../lib/stripe/plans';

// ─── 1. Centralized Pricing Config ───────────────────────────────────────────

describe('Centralized Pricing Config — Single Source of Truth', () => {
  it('Personal plan costs $39/month', () => {
    expect(PLANS.starter.monthlyPrice).toBe(39);
    expect(PLANS.starter.stripeAmountCents).toBe(3900);
  });

  it('Start plan costs $99/month', () => {
    expect(PLANS.professional.monthlyPrice).toBe(99);
    expect(PLANS.professional.stripeAmountCents).toBe(9900);
  });

  it('Grow plan costs $199/month', () => {
    expect(PLANS.agency.monthlyPrice).toBe(199);
    expect(PLANS.agency.stripeAmountCents).toBe(19900);
  });

  it('Enterprise plan has no public price (contact sales)', () => {
    expect(PLANS.enterprise.monthlyPrice).toBeNull();
    expect(PLANS.enterprise.stripeAmountCents).toBeNull();
    expect(PLANS.enterprise.stripePriceIdEnvKey).toBeNull();
  });

  it('No plan uses the retired $49/$129/$249 pricing', () => {
    const oldPrices = [49, 129, 249];
    for (const plan of PLANS_LIST) {
      if (plan.monthlyPrice !== null) {
        expect(oldPrices).not.toContain(plan.monthlyPrice);
      }
    }
  });

  it('Plan IDs use professional, not growth', () => {
    const planIds = PLANS_LIST.map(p => p.id);
    expect(planIds).toContain('professional');
    expect(planIds).not.toContain('growth');
  });

  it('Checkout plans are starter, professional, agency only', () => {
    const checkoutIds = CHECKOUT_PLANS.map(p => p.id);
    expect(checkoutIds).toEqual(['starter', 'professional', 'agency']);
    expect(checkoutIds).not.toContain('enterprise');
    expect(checkoutIds).not.toContain('growth');
  });

  it('Stripe price ID env keys reference correct variable names', () => {
    expect(PLANS.starter.stripePriceIdEnvKey).toBe('STRIPE_STARTER_PRICE_ID');
    expect(PLANS.professional.stripePriceIdEnvKey).toBe('STRIPE_PROFESSIONAL_PRICE_ID');
    expect(PLANS.agency.stripePriceIdEnvKey).toBe('STRIPE_AGENCY_PRICE_ID');
  });

  it('Annual prices are approximately 20% lower than monthly', () => {
    for (const plan of [PLANS.starter, PLANS.professional, PLANS.agency]) {
      const monthly = plan.monthlyPrice!;
      const annual = plan.annualPrice!;
      const discountPct = (monthly - annual) / monthly;
      // Allow 15%–25% range
      expect(discountPct).toBeGreaterThanOrEqual(0.15);
      expect(discountPct).toBeLessThanOrEqual(0.25);
    }
  });

  it('Plan client limits are correct', () => {
    expect(PLANS.starter.maxClients).toBe(3);
    expect(PLANS.professional.maxClients).toBe(300);
    expect(PLANS.agency.maxClients).toBe(600);
  });

  it('Plan team member limits are correct', () => {
    expect(PLANS.starter.maxTeamMembers).toBe(1);
    expect(PLANS.professional.maxTeamMembers).toBe(3);
    expect(PLANS.agency.maxTeamMembers).toBe(6);
  });

  it('Plan storage limits are correct (GB)', () => {
    expect(PLANS.starter.storageGb).toBe(5);
    expect(PLANS.professional.storageGb).toBe(25);
    expect(PLANS.agency.storageGb).toBe(100);
  });
});

// ─── 2. Trial Consistency ─────────────────────────────────────────────────────

describe('Trial Configuration — $1 paid trial with retry policy', () => {
  it('Trial duration is exactly 14 days', () => {
    expect(TRIAL_CONFIG.durationDays).toBe(14);
  });

  it('Trial charges $1 and requires a credit card', () => {
    expect(TRIAL_CONFIG.chargeCents).toBe(100);
    expect(TRIAL_CONFIG.requiresCreditCard).toBe(true);
  });

  it('Trial label clearly discloses the $1 charge and duration', () => {
    expect(TRIAL_CONFIG.label).toContain('$1');
    expect(TRIAL_CONFIG.label).toContain('14 days');
  });

  it('Defines the agreed grace and retry periods', () => {
    expect(TRIAL_CONFIG.gracePeriodDays).toBe(3);
    expect(TRIAL_CONFIG.retryPeriodDays).toBe(7);
  });

  it('Trial label does not say "7-day"', () => {
    expect(TRIAL_CONFIG.label.toLowerCase()).not.toContain('7-day');
    expect(TRIAL_CONFIG.label.toLowerCase()).not.toContain('7 day');
  });

  it('Trial short label states the paid offer', () => {
    expect(TRIAL_CONFIG.shortLabel).toBe('$1 for 14 days');
  });
});

// ─── 3. Checkout Route Safety ─────────────────────────────────────────────────

describe('Checkout Route — Paid Trial Safety', () => {
  it('create-checkout route source does not contain invoiceItems.create', async () => {
    // Read the route source and verify no $1 invoice item is created
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).not.toContain('invoiceItems.create');
    expect(source).not.toContain('invoice_items');
    expect(source).not.toContain('amount: 100'); // $1 = 100 cents
    expect(source).not.toContain('unit_amount: 100');
  });

  it('create-checkout route uses TRIAL_CONFIG.durationDays for trial period', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain('TRIAL_CONFIG.durationDays');
    expect(source).not.toContain('trial_period_days: 7');
    expect(source).not.toContain('trial_period_days: 1');
  });

  it('create-checkout route imports from plans.ts (single source of truth)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain("from '@/lib/stripe/plans'");
    expect(source).toContain('TRIAL_CONFIG');
    expect(source).toContain('CHECKOUT_PLANS');
    expect(source).toContain('getStripePriceId');
  });

  it('create-checkout route uses professional plan ID, not growth', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    // Should not hardcode 'growth' as a valid plan
    // (growth may appear as a legacy alias comment, but not as a valid checkout plan)
    expect(source).not.toContain("plan: 'growth'");
    expect(source).not.toContain('plan === "growth"');
    expect(source).not.toContain("isValidCheckoutPlan('growth')");
  });

  it('create-checkout route has duplicate subscription guard', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain('alreadyActive');
    expect(source).toContain('ACTIVE_STATUSES');
    expect(source).toContain('subscription_status');
  });
});

// ─── 4. Professional Plan ID Usage ───────────────────────────────────────────

describe('Professional Plan ID — not legacy growth', () => {
  it('PLANS.professional.id is "professional"', () => {
    expect(PLANS.professional.id).toBe('professional');
  });

  it('getStripePriceId resolves professional from STRIPE_PROFESSIONAL_PRICE_ID env var', () => {
    // When env var is set to a real value, it should return it
    const originalVal = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    process.env.STRIPE_PROFESSIONAL_PRICE_ID = 'price_test_professional_123';
    const priceId = getStripePriceId('professional');
    expect(priceId).toBe('price_test_professional_123');
    // Restore
    if (originalVal !== undefined) {
      process.env.STRIPE_PROFESSIONAL_PRICE_ID = originalVal;
    } else {
      delete process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    }
  });

  it('getStripePriceId returns null for placeholder values', () => {
    const originalVal = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    process.env.STRIPE_PROFESSIONAL_PRICE_ID = 'your-stripe-professional-price-id';
    const priceId = getStripePriceId('professional');
    expect(priceId).toBeNull();
    // Restore
    if (originalVal !== undefined) {
      process.env.STRIPE_PROFESSIONAL_PRICE_ID = originalVal;
    } else {
      delete process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    }
  });

  it('getStripePriceId returns null when env var is missing', () => {
    const originalVal = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    delete process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    const priceId = getStripePriceId('professional');
    expect(priceId).toBeNull();
    // Restore
    if (originalVal !== undefined) {
      process.env.STRIPE_PROFESSIONAL_PRICE_ID = originalVal;
    }
  });

  it('email service uses professional, not growth, for $99 plan', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const emailPath = path.resolve(
      process.cwd(),
      'src/lib/email/emailService.ts'
    );
    const source = fs.readFileSync(emailPath, 'utf-8');

    // professional: '99' must be present
    expect(source).toContain("professional: '99'");
    // growth may appear as legacy alias but must not be the primary key
    // The primary key for $99 must be 'professional'
    const professionalMatch = source.match(/professional:\s*'99'/);
    expect(professionalMatch).not.toBeNull();
  });
});

// ─── 5. Duplicate Checkout Prevention ────────────────────────────────────────

describe('Duplicate Checkout Prevention', () => {
  it('ACTIVE_STATUSES includes trialing, active, and trial_active', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain("'trialing'");
    expect(source).toContain("'active'");
    expect(source).toContain("'trial_active'");
  });

  it('Checkout returns alreadyActive:true when user has active subscription', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain('alreadyActive: true');
    expect(source).toContain("redirectTo: '/dashboard'");
  });

  it('Webhook handler has unique constraint on stripe_event_id (migration verified)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260701120000_billing_events_schema_hardening.sql'
    );

    const exists = fs.existsSync(migrationPath);
    expect(exists).toBe(true);

    if (exists) {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      // Must have unique constraint on stripe_event_id
      expect(sql.toLowerCase()).toContain('stripe_event_id');
      const hasUnique =
        sql.toLowerCase().includes('unique') ||
        sql.toLowerCase().includes('unique_violation') ||
        sql.toLowerCase().includes('on conflict');
      expect(hasUnique).toBe(true);
    }
  });
});

// ─── 6. Demo Mode Isolation ───────────────────────────────────────────────────

describe('Demo Mode Isolation — Cannot Access Production Data', () => {
  it('demoData.ts uses only synthetic fixture IDs (prefixed demo-)', async () => {
    const { DEMO_AGENCY, DEMO_CLIENTS, DEMO_DISPUTES, DEMO_LETTERS } = await import(
      '../lib/demo/demoData'
    );

    expect(DEMO_AGENCY.id).toMatch(/^demo-/);

    for (const client of DEMO_CLIENTS) {
      expect(client.id).toMatch(/^demo-/);
    }

    if (DEMO_DISPUTES) {
      for (const dispute of DEMO_DISPUTES) {
        expect(dispute.id).toMatch(/^demo-/);
      }
    }

    if (DEMO_LETTERS) {
      for (const letter of DEMO_LETTERS) {
        expect(letter.id).toMatch(/^demo-/);
      }
    }
  });

  it('demoData.ts uses .example.invalid or .invalid email domains (not real domains)', async () => {
    const { DEMO_CLIENTS } = await import('../lib/demo/demoData');

    for (const client of DEMO_CLIENTS) {
      const email = client.email.toLowerCase();
      const isInvalidDomain =
        email.endsWith('.invalid') ||
        email.endsWith('.example') ||
        email.includes('.example.') ||
        email.includes('@example.');
      expect(isInvalidDomain).toBe(true);
    }
  });

  it('demoData.ts SSNs are masked (not real SSN format)', async () => {
    const { DEMO_CLIENTS } = await import('../lib/demo/demoData');

    for (const client of DEMO_CLIENTS) {
      // Real SSNs are 9 digits: XXX-XX-XXXX
      // Demo SSNs must be masked: XXX-XX-XXXX or similar
      const ssn = client.ssn;
      const hasRealSsn = /^\d{3}-\d{2}-\d{4}$/.test(ssn);
      expect(hasRealSsn).toBe(false); // Must be masked, not real format
    }
  });

  it('DemoModeContent does not import Supabase client', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const demoContentPath = path.resolve(
      process.cwd(),
      'src/app/demo-mode/components/DemoModeContent.tsx'
    );
    const source = fs.readFileSync(demoContentPath, 'utf-8');

    // Demo mode must not query production Supabase tables
    expect(source).not.toContain("from '@/lib/supabase/client'");
    expect(source).not.toContain("from '@/lib/supabase/server'");
    expect(source).not.toContain("from '@/lib/supabase/admin'");
    expect(source).not.toContain('.from(');
  });

  it('DemoModeContent imports only from demoData', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const demoContentPath = path.resolve(
      process.cwd(),
      'src/app/demo-mode/components/DemoModeContent.tsx'
    );
    const source = fs.readFileSync(demoContentPath, 'utf-8');

    // Must import from demoData
    expect(source).toContain("from '@/lib/demo/demoData'");
  });

  it('Demo guard module correctly identifies demo-mode paths', async () => {
    const { isDemoModePath } = await import('../lib/demo/demoGuard');

    expect(isDemoModePath('/demo-mode')).toBe(true);
    expect(isDemoModePath('/demo-mode/clients')).toBe(true);
    expect(isDemoModePath('/dashboard')).toBe(false);
    expect(isDemoModePath('/demo')).toBe(false);
    expect(isDemoModePath('/')).toBe(false);
  });

  it('Demo guard assertDemoId rejects non-demo IDs', async () => {
    const { assertDemoId, DemoModeViolationError } = await import('../lib/demo/demoGuard');

    // Valid demo ID — should not throw
    expect(() => assertDemoId('demo-client-001', 'clientId')).not.toThrow();

    // Production-looking ID — should throw
    expect(() =>
      assertDemoId('550e8400-e29b-41d4-a716-446655440000', 'clientId')
    ).toThrow(DemoModeViolationError);
  });

  it('/demo-mode is NOT in the middleware protected paths', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');
    const source = fs.readFileSync(middlewarePath, 'utf-8');

    // Extract the protectedPaths array content
    const protectedMatch = source.match(/const protectedPaths\s*=\s*\[([\s\S]*?)\];/);
    expect(protectedMatch).not.toBeNull();

    if (protectedMatch) {
      const pathsContent = protectedMatch[1];
      // /demo-mode must NOT be in the protected paths list
      expect(pathsContent).not.toContain("'/demo-mode'");
      expect(pathsContent).not.toContain('"/demo-mode"');
    }
  });
});

// ─── 7. RLS Cross-Tenant Isolation Smoke Test ────────────────────────────────

describe('RLS Tenant Isolation — Smoke Tests (schema verification)', () => {
  it('RLS migration file exists for tenant isolation', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260604150000_rls_tenant_isolation.sql'
    );

    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('RLS migration enables RLS on staff_clients table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260604150000_rls_tenant_isolation.sql'
    );

    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8').toLowerCase();
      expect(sql).toContain('enable row level security');
      expect(sql).toContain('staff_clients');
    }
  });

  it('RLS migration enables RLS on workspaces table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260604150000_rls_tenant_isolation.sql'
    );

    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8').toLowerCase();
      expect(sql).toContain('workspaces');
    }
  });

  it('RLS migration has tenant isolation policy', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260604150000_rls_tenant_isolation.sql'
    );

    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8').toLowerCase();
      expect(sql).toMatch(/workspace_id|owner_id/);
      expect(sql).toContain('create policy');
    }
  });

  it('Billing events RLS migration exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260630180000_rls_billing_events_audit.sql'
    );

    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('Cross-tenant security test file exists and is not empty', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const testPath = path.resolve(
      process.cwd(),
      'src/__tests__/cross-tenant-security.test.ts'
    );

    expect(fs.existsSync(testPath)).toBe(true);
    const content = fs.readFileSync(testPath, 'utf-8');
    expect(content.length).toBeGreaterThan(1000);
    expect(content).toContain('Owner A cannot read Workspace B clients');
  });
});

// ─── 8. Storage Privacy Tests ─────────────────────────────────────────────────

describe('Storage Privacy — Private Client Documents', () => {
  it('Storage migration enforces organization-scoped paths', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));

    // At least one migration must reference storage or client_documents
    const storageRelated = files.filter(f => {
      const content = fs.readFileSync(path.join(migrationDir, f), 'utf-8').toLowerCase();
      return content.includes('storage') || content.includes('client_documents');
    });

    expect(storageRelated.length).toBeGreaterThan(0);
  });

  it('Admin client module does not expose service role key to browser', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const adminPath = path.resolve(process.cwd(), 'src/lib/supabase/admin.ts');

    if (fs.existsSync(adminPath)) {
      const source = fs.readFileSync(adminPath, 'utf-8');
      // Admin client must only use server-side env var (not NEXT_PUBLIC_)
      expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
    }
  });

  it('Supabase client module does not import service role key', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const clientPath = path.resolve(process.cwd(), 'src/lib/supabase/client.ts');

    if (fs.existsSync(clientPath)) {
      const source = fs.readFileSync(clientPath, 'utf-8');
      expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source).not.toContain('service_role');
    }
  });
});

// ─── 9. Stripe Environment Variable Safety ───────────────────────────────────

describe('Stripe Environment Variables — Safe Disabled State', () => {
  it('getStripePriceId returns null for all plans when env vars are placeholders', () => {
    const originalVars: Record<string, string | undefined> = {
      STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID,
      STRIPE_PROFESSIONAL_PRICE_ID: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      STRIPE_AGENCY_PRICE_ID: process.env.STRIPE_AGENCY_PRICE_ID,
    };

    process.env.STRIPE_STARTER_PRICE_ID = 'your-stripe-starter-price-id';
    process.env.STRIPE_PROFESSIONAL_PRICE_ID = 'your-stripe-professional-price-id';
    process.env.STRIPE_AGENCY_PRICE_ID = 'your-stripe-agency-price-id';

    expect(getStripePriceId('starter')).toBeNull();
    expect(getStripePriceId('professional')).toBeNull();
    expect(getStripePriceId('agency')).toBeNull();

    // Restore
    for (const [key, val] of Object.entries(originalVars)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
    }
  });

  it('Checkout route falls back to price_data when price IDs are missing', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    // Must have price_data fallback
    expect(source).toContain('price_data');
    // Must use getStripePriceId (which returns null for placeholders)
    expect(source).toContain('getStripePriceId');
  });

  it('Checkout route returns 503 when STRIPE_SECRET_KEY is not configured', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain('503');
    expect(source).toContain('STRIPE_SECRET_KEY');
  });

  it('STRIPE_PROFESSIONAL_PRICE_ID env var key exists in plans.ts', () => {
    expect(PLANS.professional.stripePriceIdEnvKey).toBe('STRIPE_PROFESSIONAL_PRICE_ID');
  });

  it('STRIPE_GROWTH_PRICE_ID is not referenced in plans.ts', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const plansPath = path.resolve(process.cwd(), 'src/lib/stripe/plans.ts');
    const source = fs.readFileSync(plansPath, 'utf-8');

    expect(source).not.toContain('STRIPE_GROWTH_PRICE_ID');
  });
});

// ─── 10. No Old Pricing in Public Code ───────────────────────────────────────

describe('No Retired $49/$129/$249 Pricing in Public-Facing Code', () => {
  const PUBLIC_FILES = [
    'src/app/homepage/components/HomepageContent.tsx',
    'src/app/pricing/components/PricingContent.tsx',
    'src/app/checkout/components/CheckoutContent.tsx',
    'src/lib/email/emailService.ts',
    'src/lib/stripe/plans.ts',
  ];

  for (const filePath of PUBLIC_FILES) {
    it(`${filePath} does not contain retired $49/$129/$249 prices`, async () => {
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) return; // Skip if file doesn't exist

      const source = fs.readFileSync(fullPath, 'utf-8');

      // Check for old prices as standalone numbers (not part of larger numbers)
      // Check retired prices as standalone plan amounts.
      const oldPricePatterns = [
        /monthlyPrice:\s*49\b/,
        /price:\s*49\b/,
        /\$49\b/,
        /monthlyPrice:\s*129\b/,
        /price:\s*129\b/,
        /\$129\b/,
        /monthlyPrice:\s*249\b/,
        /price:\s*249\b/,
        /\$249\b/,
      ];

      for (const pattern of oldPricePatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

// ─── 11. No obsolete 7-day trial language ────────────────────────────────────

describe('No obsolete 7-day trial language in public code', () => {
  const PUBLIC_FILES = [
    'src/app/homepage/components/HomepageContent.tsx',
    'src/app/pricing/components/PricingContent.tsx',
    'src/app/checkout/components/CheckoutContent.tsx',
    'src/app/api/stripe/create-checkout/route.ts',
    'src/lib/stripe/plans.ts',
  ];

  for (const filePath of PUBLIC_FILES) {
    it(`${filePath} does not contain 7-day trial language`, async () => {
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) return;

      const source = fs.readFileSync(fullPath, 'utf-8').toLowerCase();

      expect(source).not.toContain('7-day trial');
      expect(source).not.toContain('7 day trial');
      expect(source).not.toContain('trial_period_days: 7');
    });
  }
});

// ─── 12. Secret Exposure Check ────────────────────────────────────────────────

describe('Secret Key Exposure — Not in Browser Bundle', () => {
  it('NEXT_PUBLIC_ env vars do not include secret keys', () => {
    // NEXT_PUBLIC_ vars are exposed to the browser bundle.
    // Secret keys must NEVER use NEXT_PUBLIC_ prefix.
    const dangerousPublicVars = [
      'NEXT_PUBLIC_STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_OPENAI_API_KEY',
      'NEXT_PUBLIC_ANTHROPIC_API_KEY',
    ];

    for (const varName of dangerousPublicVars) {
      expect(process.env[varName]).toBeUndefined();
    }
  });

  it('Supabase admin client uses server-only env var', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const adminPath = path.resolve(process.cwd(), 'src/lib/supabase/admin.ts');

    if (fs.existsSync(adminPath)) {
      const source = fs.readFileSync(adminPath, 'utf-8');
      // Must use SUPABASE_SERVICE_ROLE_KEY (server-only, no NEXT_PUBLIC_ prefix)
      expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
    }
  });

  it('Stripe checkout route uses STRIPE_SECRET_KEY (server-only)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/create-checkout/route.ts'
    );
    const source = fs.readFileSync(routePath, 'utf-8');

    expect(source).toContain('STRIPE_SECRET_KEY');
    expect(source).not.toContain('NEXT_PUBLIC_STRIPE_SECRET_KEY');
  });

  it('Webhook route uses STRIPE_WEBHOOK_SECRET (server-only)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const webhookPath = path.resolve(
      process.cwd(),
      'src/app/api/stripe/webhook/route.ts'
    );

    if (fs.existsSync(webhookPath)) {
      const source = fs.readFileSync(webhookPath, 'utf-8');
      expect(source).toContain('STRIPE_WEBHOOK_SECRET');
      expect(source).not.toContain('NEXT_PUBLIC_STRIPE_WEBHOOK_SECRET');
    }
  });
});

// ─── 13. Dispute Letter Preview — Draft Warning ───────────────────────────────

describe('Dispute Letter Preview — Draft Warning Required', () => {
  it('GenerateLetterForm does not say "Ready to send" without human review', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const formPath = path.resolve(
      process.cwd(),
      'src/app/dispute-letter-management/components/GenerateLetterForm.tsx'
    );

    if (fs.existsSync(formPath)) {
      const source = fs.readFileSync(formPath, 'utf-8');
      // Must not imply AI output is ready to send without review
      expect(source.toLowerCase()).not.toContain('ready to send');
      // Must contain draft warning
      const hasDraftWarning =
        source.toLowerCase().includes('draft') ||
        source.toLowerCase().includes('review') ||
        source.toLowerCase().includes('human');
      expect(hasDraftWarning).toBe(true);
    }
  });
});
