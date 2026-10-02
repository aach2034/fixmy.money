import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

test.skip(
  process.env.TRIAL_E2E_ENABLED !== "true",
  "Runs only in the isolated trial-journey gate.",
);

const DAY_MS = 24 * 60 * 60 * 1_000;
const PASSWORD = "FmmTrial_E2E_2026!";

test.describe.configure({ retries: 0 });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`TRIAL_E2E_MISSING_${name}`);
  return value;
}

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(allStrings);
  return [];
}

function messagesFrom(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value))
    return value.filter((item) => item && typeof item === "object") as Array<
      Record<string, unknown>
    >;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return messagesFrom(record.messages || record.items || record.data);
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&#x26;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"');
}

async function confirmationLink(
  email: string,
  mailpitUrl: string,
  appUrl: URL,
): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const messagesResponse = await fetch(`${mailpitUrl}/api/v1/messages?limit=50`);
    if (!messagesResponse.ok) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    const messagesBody = (await messagesResponse.json()) as unknown;
    for (const message of messagesFrom(messagesBody)) {
      const recipients = allStrings(message.To || message.to).map((value) =>
        value.toLowerCase(),
      );
      if (!recipients.includes(email.toLowerCase())) continue;
      if (String(message.Subject || message.subject) !== "Confirm your FixMy.Money account")
        continue;

      const messageId = String(message.ID || message.id || "");
      if (!messageId) continue;
      const detailResponse = await fetch(
        `${mailpitUrl}/api/v1/message/${encodeURIComponent(messageId)}`,
      );
      if (!detailResponse.ok) continue;
      const detail = (await detailResponse.json()) as Record<string, unknown>;
      const detailRecipients = allStrings(detail.To || detail.to).map((value) =>
        value.toLowerCase(),
      );
      if (!detailRecipients.includes(email.toLowerCase())) continue;

      const content = decodeHtmlAttribute(
        allStrings([detail.HTML, detail.html, detail.Text, detail.text]).join("\n"),
      );
      for (const candidate of content.match(/https?:\/\/[^\s"'<>]+/g) || []) {
        const cleaned = candidate.replace(/[).,]+$/, "");
        let parsed: URL;
        try {
          parsed = new URL(cleaned);
        } catch {
          continue;
        }
        if (
          parsed.origin === appUrl.origin &&
          parsed.pathname === "/auth/callback" &&
          parsed.searchParams.get("type") === "signup" &&
          parsed.searchParams.get("plan") === "professional" &&
          parsed.searchParams.has("token_hash")
        ) {
          return parsed.toString();
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("TRIAL_E2E_CONFIRMATION_LINK_NOT_FOUND");
}

async function userAndWorkspace(admin: SupabaseClient, email: string) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  if (listError) throw listError;
  const user = listed.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error("TRIAL_E2E_USER_NOT_FOUND");
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (workspaceError || !workspace)
    throw workspaceError || new Error("TRIAL_E2E_WORKSPACE_NOT_FOUND");
  return { user, workspace };
}

async function entitlement(admin: SupabaseClient, workspaceId: string) {
  const { data, error } = await admin
    .from("workspace_entitlements")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !data)
    throw error || new Error("TRIAL_E2E_ENTITLEMENT_NOT_FOUND");
  return data;
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login?force_reauth=1");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "SIGN IN" }).click();
}

async function postSignedStripeEvent(
  request: APIRequestContext,
  stripe: Stripe,
  webhookSecret: string,
  eventId: string,
  type: string,
  object: unknown,
) {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    api_version: null,
    created: Math.floor(Date.now() / 1_000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const response = await request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

test("signup, confirmation, application trial, expiry, and supported voluntary paid conversion", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const appUrl = new URL(
    process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4028",
  );
  const supabaseUrl = new URL(required("TEST_SUPABASE_URL"));
  if (
    !["127.0.0.1", "localhost"].includes(appUrl.hostname) ||
    !["127.0.0.1", "localhost"].includes(supabaseUrl.hostname) ||
    supabaseUrl.protocol !== "http:"
  ) {
    throw new Error("TRIAL_E2E_LOCAL_STACK_REQUIRED");
  }

  const email = required("TRIAL_E2E_EMAIL");
  const expiredEmail = email.replace("@", "-expired@");
  const serviceRoleKey = required("TEST_SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = required("STRIPE_SECRET_KEY");
  const webhookSecret = required("STRIPE_WEBHOOK_SECRET");
  const mailpitUrl = required("TEST_MAILPIT_URL").replace(/\/$/, "");
  if (
    !email.endsWith("@test.invalid") ||
    !expiredEmail.endsWith("@test.invalid") ||
    !stripeKey.startsWith("sk_test_")
  ) {
    throw new Error("TRIAL_E2E_SYNTHETIC_IDENTITIES_AND_TEST_BILLING_REQUIRED");
  }
  const admin = createClient(
    supabaseUrl.toString().replace(/\/$/, ""),
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  const stripe = new Stripe(stripeKey);

  await page.goto("/signup?plan=starter");
  await expect(page.getByRole("alert")).toContainText(
    "That plan is not available for new accounts. Choose FixMy Pro or FixMy Scale for your business.",
  );
  await expect(
    page.getByRole("button", { name: "START 30-DAY FREE TRIAL" }),
  ).toBeDisabled();

  await page.goto("/signup?plan=professional");
  await page.getByLabel("Company name").fill("FMM Isolated Trial Company");
  await page.getByLabel("Your name").fill("FMM Isolated Owner");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.locator('input[name="businessUse"]').check();
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "START 30-DAY FREE TRIAL" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  const beforeConfirmation = await userAndWorkspace(admin, email);
  expect(beforeConfirmation.user.email_confirmed_at).toBeFalsy();
  const link = await confirmationLink(email, mailpitUrl, appUrl);
  await page.goto(link);
  await page.waitForURL(/\/onboarding(?:\?|$)/, { timeout: 30_000 });

  await page
    .getByPlaceholder("Your company name")
    .fill("FMM Isolated Trial Company");
  await page.getByPlaceholder("Jane Smith").fill("FMM Isolated Owner");
  await page.locator("select").selectOption("credit_repair");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue without connecting" })
    .click();
  await page.getByRole("button", { name: "Go to Dashboard" }).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });

  const account = await userAndWorkspace(admin, email);
  expect(account.user.email_confirmed_at).toBeTruthy();
  const initialTrial = await entitlement(admin, account.workspace.id);
  expect(initialTrial.plan_id).toBe("professional");
  expect(initialTrial.access_state).toBe("trial");
  expect(initialTrial.trial_source).toBe("application");
  expect(initialTrial.stripe_customer_id).toBeNull();
  expect(initialTrial.stripe_subscription_id).toBeNull();
  expect(
    Date.parse(initialTrial.free_trial_ends_at) -
      Date.parse(initialTrial.free_trial_started_at),
  ).toBe(30 * DAY_MS);
  expect((await stripe.customers.list({ email, limit: 10 })).data).toHaveLength(
    0,
  );

  await page.goto("/billing-subscriptions");
  await expect(
    page.getByText("30-day free trial. No credit card required."),
  ).toBeVisible();
  await expect(page.getByText(/Trial ends .*30 days remaining/)).toBeVisible();

  const repeated = await page.evaluate(async () => {
    const response = await fetch("/api/onboarding", { method: "POST" });
    return { status: response.status, body: await response.json() };
  });
  expect(repeated.status).toBe(200);
  const repeatedTrial = await entitlement(admin, account.workspace.id);
  expect(repeatedTrial.free_trial_started_at).toBe(
    initialTrial.free_trial_started_at,
  );
  expect(repeatedTrial.free_trial_ends_at).toBe(
    initialTrial.free_trial_ends_at,
  );

  const { data: expiredUser, error: expiredUserError } =
    await admin.auth.admin.createUser({
      email: expiredEmail,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Expired Trial Owner",
        company_name: "Expired Trial Company",
        plan: "professional",
      },
    });
  if (expiredUserError || !expiredUser.user)
    throw expiredUserError || new Error("TRIAL_E2E_EXPIRED_USER_FAILED");
  const expired = await userAndWorkspace(admin, expiredEmail);
  const expiredEnd = new Date(Date.now() - 60_000);
  const expiredStart = new Date(expiredEnd.getTime() - 30 * DAY_MS);
  const { error: expiredProfileError } = await admin
    .from("user_profiles")
    .update({
      onboarding_completed: true,
      onboarding_company_completed: true,
    })
    .eq("id", expired.user.id);
  if (expiredProfileError) throw expiredProfileError;
  const { error: expiredEntitlementError } = await admin
    .from("workspace_entitlements")
    .update({
      plan_id: "professional",
      access_state: "trial",
      stripe_status: "none",
      trial_source: "application",
      free_trial_started_at: expiredStart.toISOString(),
      free_trial_ends_at: expiredEnd.toISOString(),
      trial_ends_at: expiredEnd.toISOString(),
      last_verified_at: expiredStart.toISOString(),
    })
    .eq("workspace_id", expired.workspace.id);
  if (expiredEntitlementError) throw expiredEntitlementError;

  const expiredContext = await browser.newContext();
  const expiredPage = await expiredContext.newPage();
  await login(expiredPage, expiredEmail);
  await expiredPage.waitForURL(/\/billing-subscriptions(?:\?|$)/, {
    timeout: 30_000,
  });
  await expect(expiredPage.getByText("expired", { exact: true })).toBeVisible();
  const expiredFeatureResponse = await expiredPage.evaluate(async () => {
    const response = await fetch("/api/clients");
    return { status: response.status, body: await response.json() };
  });
  expect(expiredFeatureResponse).toEqual(
    expect.objectContaining({
      status: 403,
      body: expect.objectContaining({ code: "trial_ended" }),
    }),
  );
  expect(
    (await stripe.customers.list({ email: expiredEmail, limit: 10 })).data,
  ).toHaveLength(0);
  expect(
    (await entitlement(admin, expired.workspace.id)).stripe_subscription_id,
  ).toBeNull();
  await expiredContext.close();

  const now = new Date();
  const { error: verificationError } = await admin
    .from("business_purchaser_verifications")
    .upsert(
      {
        workspace_id: account.workspace.id,
        purchaser_user_id: account.user.id,
        legal_business_name: "FMM Isolated Trial Company",
        business_type: "credit_repair",
        formation_jurisdiction: "NY",
        business_address_summary: "Synthetic isolated CI fixture",
        authorized_representative_name: "FMM Isolated Owner",
        intended_business_use: "Exercise the isolated paid conversion journey.",
        identifier_type: "ein",
        identifier_last_four: "0000",
        attested_for_business: true,
        plan_ids: ["professional"],
        status: "verified",
        reviewer_id: account.user.id,
        business_evidence_ref: `isolated-ci:${required("TRIAL_E2E_RUN_ID")}`,
        verification_checks: {
          formation: true,
          identifier: true,
          address: true,
          representative: true,
          license_or_exemption: true,
        },
        review_reason: "Synthetic isolated CI verification only",
        reviewed_at: now.toISOString(),
        expires_at: new Date(now.getTime() + DAY_MS).toISOString(),
      },
      { onConflict: "workspace_id" },
    );
  if (verificationError) throw verificationError;

  await page.reload();
  await page.getByRole("link", { name: "Subscribe to FixMy Pro" }).click();
  await expect(page.getByText("FixMy Pro is $99/month")).toBeVisible();
  await page
    .getByRole("button", { name: "Subscribe to FixMy Pro — $99/month" })
    .click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

  const checkoutEntitlement = await entitlement(admin, account.workspace.id);
  const customerId = checkoutEntitlement.stripe_customer_id;
  if (typeof customerId !== "string" || !customerId.startsWith("cus_")) {
    throw new Error("TRIAL_E2E_CHECKOUT_CUSTOMER_MISSING");
  }
  const sessionSummary = (
    await stripe.checkout.sessions.list({ customer: customerId, limit: 10 })
  ).data.find(
    (candidate) =>
      candidate.metadata?.workspaceId === account.workspace.id &&
      candidate.metadata?.plan === "professional",
  );
  if (!sessionSummary) throw new Error("TRIAL_E2E_CHECKOUT_SESSION_MISSING");
  const session = await stripe.checkout.sessions.retrieve(sessionSummary.id, {
    expand: ["line_items"],
  });
  expect(session.mode).toBe("subscription");
  expect(session.status).toBe("open");
  expect(session.payment_status).toBe("unpaid");
  expect(session.line_items?.data[0]?.price?.id).toBe(
    required("STRIPE_PROFESSIONAL_PRICE_ID"),
  );

  // https://docs.stripe.com/automated-testing documents that Checkout and the
  // Payment Element deliberately use anti-automation controls. The browser
  // proves the real hosted redirect; supported test PaymentMethods exercise
  // decline/success outputs without bypassing CAPTCHA or putting card numbers
  // in test code.
  let decline: unknown;
  try {
    await stripe.paymentIntents.create({
      amount: 9_900,
      currency: "usd",
      payment_method: "pm_card_visa_chargeDeclined",
      confirm: true,
      payment_method_types: ["card"],
    });
  } catch (error) {
    decline = error;
  }
  if (!(decline instanceof Stripe.errors.StripeCardError)) {
    throw decline || new Error("TRIAL_E2E_EXPECTED_STRIPE_DECLINE");
  }
  expect(decline.code).toBe("card_declined");
  await postSignedStripeEvent(
    request,
    stripe,
    webhookSecret,
    `evt_fmm_trial_decline_${required("TRIAL_E2E_RUN_ID").replace(/[^a-zA-Z0-9_]/g, "_")}`,
    "checkout.session.async_payment_failed",
    session,
  );
  const entitlementDuringFailedPayment = await entitlement(
    admin,
    account.workspace.id,
  );
  expect(entitlementDuringFailedPayment.access_state).toBe("trial");
  expect(entitlementDuringFailedPayment.stripe_subscription_id).toBeNull();

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method: "pm_card_visa",
    payment_method_types: ["card"],
    confirm: true,
    usage: "off_session",
  });
  expect(setupIntent.status).toBe("succeeded");
  if (typeof setupIntent.payment_method !== "string") {
    throw new Error("TRIAL_E2E_PAYMENT_METHOD_MISSING");
  }
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: required("STRIPE_PROFESSIONAL_PRICE_ID") }],
    default_payment_method: setupIntent.payment_method,
    payment_behavior: "error_if_incomplete",
    metadata: {
      plan: "professional",
      userId: account.user.id,
      workspaceId: account.workspace.id,
    },
  });
  expect(subscription.status).toBe("active");
  const latestInvoice =
    typeof subscription.latest_invoice === "string"
      ? await stripe.invoices.retrieve(subscription.latest_invoice)
      : subscription.latest_invoice;
  expect(latestInvoice?.status).toBe("paid");
  expect(latestInvoice?.amount_paid).toBe(9_900);

  await postSignedStripeEvent(
    request,
    stripe,
    webhookSecret,
    `evt_fmm_trial_success_${required("TRIAL_E2E_RUN_ID").replace(/[^a-zA-Z0-9_]/g, "_")}`,
    "checkout.session.completed",
    {
      ...session,
      payment_status: "paid",
      status: "complete",
      subscription: subscription.id,
    },
  );
  await page.goto(
    `/dashboard?checkout=success&session_id=${encodeURIComponent(session.id)}`,
  );
  await page.waitForURL(/\/dashboard\?checkout=success&session_id=/, {
    timeout: 30_000,
  });

  const paidEntitlement = await entitlement(admin, account.workspace.id);
  expect(paidEntitlement.access_state).toBe("active");
  expect(paidEntitlement.stripe_status).toBe("active");
  expect(paidEntitlement.stripe_subscription_id).toBe(subscription.id);
  expect(paidEntitlement.free_trial_started_at).toBe(
    initialTrial.free_trial_started_at,
  );
  expect(paidEntitlement.free_trial_ends_at).toBe(
    initialTrial.free_trial_ends_at,
  );

  await page.context().clearCookies();
  await page.goto("/login?force_reauth=1");
  await page.evaluate(() => window.localStorage.clear());
  await login(page, email);
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });
  await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
});
