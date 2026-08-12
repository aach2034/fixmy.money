const SITE_URL = "https://fixmy.money";
const ALLOWED_ORIGINS = new Set([
  "https://fixmy.money",
  "https://www.fixmy.money",
  "http://localhost:4028",
]);
const ALLOWED_TYPES = new Set([
  "trial_confirmation",
  "subscription_started",
  "renewal_reminder",
  "analysis_complete",
  "dispute_recommendations_ready",
  "client_notification",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function email(value: unknown) {
  const normalized = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function number(value: unknown, min = 0, max = 100000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : 0;
}

function escapeHtml(value: unknown) {
  return text(value, 500)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value: unknown, fallback = "Professional") {
  const clean = text(value, 40);
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : fallback;
}

function template(options: {
  heading: string;
  greeting: string;
  paragraphs: string[];
  rows?: Array<[string, string]>;
  ctaLabel: string;
  ctaPath: string;
}) {
  const rows = (options.rows || []).map(([label, value]) => `
    <tr>
      <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td>
    </tr>`).join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:#059669;padding:28px 24px;text-align:center;">
        <div style="color:#ffffff;font-size:28px;font-weight:700;">Fix My Money</div>
        <div style="color:#d1fae5;margin-top:6px;font-size:14px;">Credit Repair Business Platform</div>
      </div>
      <div style="padding:36px 30px;">
        <h1 style="font-size:22px;margin:0 0 18px;">${escapeHtml(options.heading)}</h1>
        <p style="font-size:16px;line-height:1.6;">${escapeHtml(options.greeting)}</p>
        ${options.paragraphs.map((p) => `<p style="font-size:15px;line-height:1.65;color:#374151;">${escapeHtml(p)}</p>`).join("")}
        ${rows ? `<table style="width:100%;border-collapse:collapse;margin:22px 0;">${rows}</table>` : ""}
        <div style="text-align:center;margin:30px 0 12px;">
          <a href="${SITE_URL}${options.ctaPath}" style="display:inline-block;background:#059669;color:#fff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(options.ctaLabel)}</a>
        </div>
        <p style="font-size:13px;line-height:1.5;color:#6b7280;">If you did not expect this email, contact support before taking action.</p>
      </div>
      <div style="padding:20px;text-align:center;background:#f9fafb;color:#9ca3af;font-size:12px;">© 2026 Fix My Money</div>
    </div>
  </body>
</html>`;
}

async function getAuthenticatedUser(authHeader: string, supabaseUrl: string, anonKey: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anonKey },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id && user?.email ? { id: String(user.id), email: email(user.email) } : null;
}

async function ownsClientEmail(
  authHeader: string,
  supabaseUrl: string,
  anonKey: string,
  userId: string,
  recipient: string,
) {
  const params = new URLSearchParams({
    select: "id",
    owner_id: `eq.${userId}`,
    email: `ilike.${recipient}`,
    limit: "1",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/staff_clients?${params.toString()}`, {
    headers: { Authorization: authHeader, apikey: anonKey },
  });
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin") || "";
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, 403, { error: "Origin not allowed" });
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json(req, 401, { error: "Authentication required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !resendKey || !serviceRoleKey) {
    console.error("Required function secrets are missing");
    return json(req, 503, { error: "Email service is unavailable" });
  }

  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
  const currentUser = isServiceRole
    ? null
    : await getAuthenticatedUser(authHeader, supabaseUrl, anonKey);
  if (!isServiceRole && !currentUser) {
    return json(req, 401, { error: "Invalid or expired session" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  const type = text(body.type, 60);
  const to = email(body.to);
  if (!ALLOWED_TYPES.has(type) || !to) return json(req, 400, { error: "Invalid email request" });

  if (!isServiceRole && type === "client_notification") {
    const requestedClientEmail = email(body.clientEmail);
    if (
      requestedClientEmail !== to ||
      !(await ownsClientEmail(authHeader, supabaseUrl, anonKey, currentUser!.id, to))
    ) {
      return json(req, 403, { error: "Recipient is not one of your clients" });
    }
  } else if (!isServiceRole && to !== currentUser!.email) {
    return json(req, 403, { error: "Account notifications can only be sent to the signed-in user" });
  }

  const planName = titleCase(body.plan);
  const recipientName = text(body.name, 100) || "there";
  let subject = "";
  let html = "";

  switch (type) {
    case "trial_confirmation": {
      subject = "Your Fix My Money 14-Day $1 Trial Is Active";
      html = template({
        heading: "Your 14-day trial is active",
        greeting: `Hi ${recipientName},`,
        paragraphs: [
          `Your ${planName} plan trial is ready. Your private company workspace is available now.`,
          "You can manage billing or cancel before renewal from Billing Settings.",
        ],
        rows: [
          ["Trial ends", text(body.trialEndDate, 60) || "14 days from signup"],
          ["Renewal amount", `$${number(body.amount, 0, 10000) || 49}/month`],
        ],
        ctaLabel: "Open Your Workspace",
        ctaPath: "/homepage",
      });
      break;
    }
    case "subscription_started": {
      subject = `Your Fix My Money ${planName} Subscription Is Active`;
      html = template({
        heading: "Subscription confirmed",
        greeting: `Hi ${recipientName},`,
        paragraphs: ["Your subscription is active and your company workspace remains available."],
        rows: [
          ["Plan", planName],
          ["Amount", `$${number(body.amount, 0, 10000) || 99}/month`],
          ["Next renewal", text(body.renewalDate, 60) || "Next month"],
        ],
        ctaLabel: "Go to Your Workspace",
        ctaPath: "/homepage",
      });
      break;
    }
    case "renewal_reminder": {
      subject = "Your Fix My Money Subscription Renews Soon";
      html = template({
        heading: "Upcoming subscription renewal",
        greeting: `Hi ${recipientName},`,
        paragraphs: ["Your subscription is scheduled to renew in three days. Review billing details before the renewal date if you need to make a change."],
        rows: [
          ["Plan", planName],
          ["Amount", `$${number(body.amount, 0, 10000) || 99}/month`],
          ["Renewal date", text(body.renewalDate, 60) || "In 3 days"],
        ],
        ctaLabel: "Manage Billing",
        ctaPath: "/billing-subscriptions",
      });
      break;
    }
    case "analysis_complete": {
      subject = "Your Credit Report Analysis Is Ready";
      html = template({
        heading: "Your credit report analysis is complete",
        greeting: `Hi ${recipientName},`,
        paragraphs: ["Sign in to review the source-linked findings and approve any next steps."],
        rows: [
          ["Negative accounts", String(number(body.totalNegativeAccounts, 0, 10000))],
          ["Collections", String(number(body.totalCollections, 0, 10000))],
          ["Late payments", String(number(body.totalLatePayments, 0, 10000))],
          ["Hard inquiries", String(number(body.totalHardInquiries, 0, 10000))],
          ["Items to review", String(number(body.improvementOpportunities, 0, 10000))],
        ],
        ctaLabel: "Review Analysis",
        ctaPath: "/onboarding",
      });
      break;
    }
    case "dispute_recommendations_ready": {
      subject = "Your Dispute Recommendations Are Ready";
      html = template({
        heading: "Dispute recommendations are ready",
        greeting: `Hi ${recipientName},`,
        paragraphs: ["Review the recommendations and supporting evidence before approving or sending any letter."],
        rows: [
          ["Recommendations", String(number(body.disputeCount, 0, 10000))],
          ["High priority", String(number(body.highPriorityCount, 0, 10000))],
        ],
        ctaLabel: "Review Recommendations",
        ctaPath: "/dispute-letter-management",
      });
      break;
    }
    case "client_notification": {
      const clientName = text(body.clientName, 100) || "there";
      subject = "Welcome to Fix My Money";
      html = template({
        heading: "Your client portal is ready",
        greeting: `Hi ${clientName},`,
        paragraphs: ["Your credit specialist has added you to their secure client workspace. Sign in to review updates and documents."],
        rows: [
          ["Plan", titleCase(body.clientPlan, "Starter")],
          ["Assigned specialist", text(body.assignedStaff, 100) || "Your credit specialist"],
        ],
        ctaLabel: "Open Client Portal",
        ctaPath: "/client-portal/login",
      });
      break;
    }
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") || "Fix My Money <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!resendResponse.ok) {
    console.error("Resend request failed", resendResponse.status);
    return json(req, 502, { error: "Email could not be sent" });
  }

  const result = await resendResponse.json();
  return json(req, 200, { success: true, id: result.id });
});
