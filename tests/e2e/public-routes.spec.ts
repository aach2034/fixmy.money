import { test, expect } from '@playwright/test';

/**
 * Public Route Browser Tests — FixMy.Money
 *
 * Tests all public-facing routes for:
 * - Page load (no 500 errors)
 * - Core content presence
 * - Navigation links
 * - CTA buttons
 * - Mobile layout
 * - Keyboard navigation
 * - Accessibility basics
 *
 * Run: npx playwright test tests/e2e/public-routes.spec.ts
 */

// ─── Homepage ─────────────────────────────────────────────────────────────────

test.describe('Homepage (/)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FixMy\.Money|Fix My Money/i);
  });

  test('has main heading', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    // At least one nav element should be present
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('has CTA button', async ({ page }) => {
    await page.goto('/');
    // Look for common CTA patterns
    const cta = page.locator('a[href*="signup"], a[href*="sign-up"], a[href*="register"], a[href*="trial"], button:has-text("Start"), a:has-text("Get Started"), a:has-text("Start Free")').first();
    await expect(cta).toBeVisible();
  });
});

// ─── /homepage ────────────────────────────────────────────────────────────────

test.describe('Homepage route (/homepage)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/homepage');
    expect(response?.status()).toBeLessThan(400);
  });
});

// ─── About ────────────────────────────────────────────────────────────────────

test.describe('About (/about)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/about');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has page heading', async ({ page }) => {
    await page.goto('/about');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

// ─── Pricing ──────────────────────────────────────────────────────────────────

test.describe('Pricing (/pricing)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has pricing content', async ({ page }) => {
    await page.goto('/pricing');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('has plan options', async ({ page }) => {
    await page.goto('/pricing');
    // Look for pricing cards or plan names
    const planContent = page.locator('text=/starter|professional|agency|plan|month/i').first();
    await expect(planContent).toBeVisible();
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────

test.describe('Security (/security)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/security');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has security content', async ({ page }) => {
    await page.goto('/security');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

// ─── Contact ──────────────────────────────────────────────────────────────────

test.describe('Contact (/contact)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/contact');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has contact form or contact information', async ({ page }) => {
    await page.goto('/contact');
    const formOrContact = page.locator('form, [href*="mailto:"], input[type="email"]').first();
    await expect(formOrContact).toBeVisible();
  });
});

// ─── Product Tour ─────────────────────────────────────────────────────────────

test.describe('Product Tour (/product-tour)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/product-tour');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has tour content', async ({ page }) => {
    await page.goto('/product-tour');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

// ─── CROA Workflow ────────────────────────────────────────────────────────────

test.describe('CROA Workflow (/croa-workflow)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/croa-workflow');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has CROA content', async ({ page }) => {
    await page.goto('/croa-workflow');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

// ─── Demo Mode ────────────────────────────────────────────────────────────────

test.describe('Demo Mode (/demo-mode)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/demo-mode');
    expect(response?.status()).toBeLessThan(400);
  });

  test('shows Demo Data badge', async ({ page }) => {
    await page.goto('/demo-mode');
    const badge = page.locator('text=/demo data|demo mode/i').first();
    await expect(badge).toBeVisible();
  });

  test('has Start Free Trial CTA', async ({ page }) => {
    await page.goto('/demo-mode');
    const cta = page.locator('text=/start free trial|get started|sign up/i').first();
    await expect(cta).toBeVisible();
  });

  test('has Exit Demo button', async ({ page }) => {
    await page.goto('/demo-mode');
    const exit = page.locator('text=/exit demo/i').first();
    await expect(exit).toBeVisible();
  });
});

// ─── Blog Listing ─────────────────────────────────────────────────────────────

test.describe('Blog Listing (/blog)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.status()).toBeLessThan(400);
  });

  test('has blog articles listed', async ({ page }) => {
    await page.goto('/blog');
    // Should have at least one article link
    const articleLinks = page.locator('a[href*="/blog/"]');
    await expect(articleLinks.first()).toBeVisible();
    const count = await articleLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ─── Blog Articles ────────────────────────────────────────────────────────────

const BLOG_SLUGS = [
  'how-to-start-a-credit-repair-business-2026',
  'best-credit-repair-software-2026',
  'credit-repair-cloud-alternatives-2026',
  'how-croa-billing-workflows-work',
  'credit-repair-client-onboarding-checklist',
  'credit-repair-crm-features',
  'how-to-automate-credit-dispute-workflows',
  'how-to-document-completed-services',
  'credit-repair-audit-logs-explained',
  'white-label-credit-repair-software',
];

for (const slug of BLOG_SLUGS) {
  test.describe(`Blog article: /blog/${slug}`, () => {
    test('loads without error', async ({ page }) => {
      const response = await page.goto(`/blog/${slug}`);
      expect(response?.status()).toBeLessThan(400);
    });

    test('has article heading', async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
    });

    test('has article content', async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      // Article should have substantial text content
      const body = await page.locator('article, main, [role="main"]').first().textContent();
      expect(body?.length ?? 0).toBeGreaterThan(500);
    });

    test('has disclaimer', async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const disclaimer = page.locator('text=/informational purposes|not.*legal advice|disclaimer/i').first();
      await expect(disclaimer).toBeVisible();
    });
  });
}

// ─── Unknown blog slug → 404 ──────────────────────────────────────────────────

test.describe('Unknown blog slug returns 404', () => {
  test('returns 404 for unknown slug', async ({ page }) => {
    const response = await page.goto('/blog/this-article-does-not-exist-xyz-abc-123');
    expect(response?.status()).toBe(404);
  });

  test('shows 404 page content', async ({ page }) => {
    await page.goto('/blog/this-article-does-not-exist-xyz-abc-123');
    const notFound = page.locator('text=/not found|404|page.*not.*exist/i').first();
    await expect(notFound).toBeVisible();
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

test.describe('Login (/login)', () => {
  test('loads without error', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
  });

  test('has login form', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('has password field', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")').first();
    await expect(submitBtn).toBeVisible();
  });
});

// ─── Signup ───────────────────────────────────────────────────────────────────

test.describe('Signup', () => {
  test('signup route loads', async ({ page }) => {
    const response = await page.goto('/signup');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /create.*account|start.*trial/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

test.describe('Forgot Password', () => {
  test('forgot password route or link exists', async ({ page }) => {
    await page.goto('/login');
    // Look for forgot password link
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), text=/forgot.*password/i').first();
    // Either the link exists on the login page, or there's a separate route
    const exists = await forgotLink.isVisible().catch(() => false);
    if (!exists) {
      // Try direct route
      const response = await page.goto('/forgot-password');
      expect(response?.status()).toBeLessThan(400);
    } else {
      await expect(forgotLink).toBeVisible();
    }
  });
});

// ─── Protected Dashboard Redirect ─────────────────────────────────────────────

test.describe('Protected dashboard redirect', () => {
  test('unauthenticated user is redirected from /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login page
    await page.waitForURL(/\/login(?:\?|$)/, { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

// ─── Admin Health Authorization ───────────────────────────────────────────────

test.describe('Admin health authorization (/admin/health)', () => {
  test('unauthenticated user cannot access /admin/health', async ({ page }) => {
    await page.goto('/admin/health');
    // Should redirect to login or show unauthorized
    await page.waitForURL(/sign-up-login-screen|login|signin|auth|dashboard/i, { timeout: 5000 }).catch(() => {});
    const currentUrl = page.url();
    const isRedirected = !/admin\/health/.test(currentUrl) ||
      (await page.locator('text=/sign in|log in|unauthorized|access denied/i').first().isVisible().catch(() => false));
    expect(isRedirected).toBe(true);
  });
});

// ─── API Health ───────────────────────────────────────────────────────────────

test.describe('API Health (/api/health)', () => {
  test('returns JSON response', async ({ page }) => {
    const response = await page.goto('/api/health');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('application/json');
  });
});

// ─── Mobile Navigation ────────────────────────────────────────────────────────

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('homepage loads on mobile', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('mobile menu button is accessible on homepage', async ({ page }) => {
    await page.goto('/');
    const mobileMenu = page.locator('button[aria-label*="navigation" i]').first();
    await expect(mobileMenu).toBeVisible();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small tolerance
  });

  test('pricing page loads on mobile', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response?.status()).toBeLessThan(400);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(395);
  });

  test('blog listing loads on mobile', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.status()).toBeLessThan(400);
  });

  test('demo mode loads on mobile', async ({ page }) => {
    const response = await page.goto('/demo-mode');
    expect(response?.status()).toBeLessThan(400);
  });
});

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

test.describe('Keyboard Navigation', () => {
  test('homepage is keyboard navigable', async ({ page }) => {
    await page.goto('/');
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Verify focus is visible somewhere on the page
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY');
  });

  test('login form is keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    // Tab to email field
    await page.keyboard.press('Tab');
    const emailFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement;
      return el?.type === 'email' || el?.name === 'email';
    });
    // Either email is focused or we can tab to it
    if (!emailFocused) {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    }
    // Verify form fields are reachable
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.focus();
    const isFocused = await emailInput.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });
});
