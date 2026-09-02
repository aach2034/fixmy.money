import process from "node:process";

const input = await new Promise((resolve, reject) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    value += chunk;
  });
  process.stdin.on("end", () => {
    try {
      resolve(JSON.parse(value));
    } catch (error) {
      reject(error);
    }
  });
  process.stdin.on("error", reject);
});

const { projectUrl, publishableKey } = input;
if (!projectUrl || !publishableKey) {
  throw new Error("projectUrl and publishableKey are required on stdin");
}

const password = "SyntheticPhase1bOnly!";
const results = [];

async function signIn(email) {
  const response = await fetch(
    `${projectUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const body = await response.json();
  if (response.status !== 200 || !body.access_token) {
    throw new Error(`sign-in failed for ${email}: HTTP ${response.status}`);
  }
  results.push({ check: `sign-in:${email}`, status: response.status, pass: true });
  return body.access_token;
}

async function select(token, table, query, expectedCount, check) {
  const response = await fetch(`${projectUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`,
    },
  });
  const body = await response.json();
  const count = Array.isArray(body) ? body.length : null;
  const pass = response.status === 200 && count === expectedCount;
  results.push({ check, status: response.status, count, expectedCount, pass });
}

const anonResponse = await fetch(
  `${projectUrl}/rest/v1/workspaces?select=id&limit=1`,
  {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
    },
  },
);
results.push({
  check: "anonymous public-table access denied",
  status: anonResponse.status,
  pass: anonResponse.status === 401 || anonResponse.status === 403,
});

const ownerA = await signIn("owner-a@phase1b.invalid");
for (const table of [
  "user_profiles",
  "workspaces",
  "staff_clients",
  "dashboard_metrics",
  "credit_report_uploads",
  "credit_report_analyses",
  "dispute_letters",
  "generated_dispute_letters",
  "launch_directories",
  "leads",
  "billing_events",
  "ai_usage_events",
  "report_provider_settings",
  "affiliate_link_clicks",
]) {
  await select(ownerA, table, "select=id", 1, `owner A isolated read: ${table}`);
}
await select(
  ownerA,
  "product_analytics_events",
  "select=id&limit=1",
  null,
  "owner A server-only analytics denied",
);
const analyticsResult = results.at(-1);
analyticsResult.pass = analyticsResult.status === 401 || analyticsResult.status === 403;

const ownerB = await signIn("owner-b@phase1b.invalid");
await select(ownerB, "user_profiles", "select=id", 1, "owner B isolated profile read");
await select(ownerB, "staff_clients", "select=id", 1, "owner B isolated client read");

const memberC = await signIn("member-c@phase1b.invalid");
await select(
  memberC,
  "workspaces",
  "select=id&id=eq.a1000000-0000-0000-0000-000000000010",
  0,
  "member candidate fails closed for owner A workspace",
);

const portalA = await signIn("portal-a@phase1b.invalid");
for (const table of [
  "client_accounts",
  "client_disputes",
  "client_documents",
  "chat_conversations",
  "chat_messages",
]) {
  await select(portalA, table, "select=id", 1, `portal A isolated read: ${table}`);
}

const portalB = await signIn("portal-b@phase1b.invalid");
await select(portalB, "client_accounts", "select=id", 1, "portal B isolated account read");

const adminF = await signIn("admin-f@phase1b.invalid");
await select(adminF, "platform_admins", "select=id", 1, "active admin role read");
await select(adminF, "admin_customer_notes", "select=id", 1, "active admin note read");

const failed = results.filter((result) => !result.pass);
console.log(
  JSON.stringify({
    checks: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  }),
);
if (failed.length > 0) process.exitCode = 1;
