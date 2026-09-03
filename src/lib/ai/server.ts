import { completion } from "@rocketnew/llm-sdk";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getSelectedWorkspaceContext,
  getWorkspaceEntitlementDecision,
} from "@/lib/subscription/server";
import type {
  AIGatewayDependencies,
  AIPlanLimits,
  AIOperationId,
  AIModel,
  AIUsageReservation,
} from "./gateway";

export interface AIGatewayAuthorization {
  actorId: string;
  workspaceId: string;
  workspaceOwnerId: string;
  planId: string | null;
}

export class AIGatewayAuthorizationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "AIGatewayAuthorizationError";
  }
}

export function isAIGatewayEnabled(): boolean {
  return process.env.AI_GATEWAY_ENABLED === "true";
}

export async function authorizeAIGateway(): Promise<AIGatewayAuthorization> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AIGatewayAuthorizationError("AI_AUTHENTICATION_REQUIRED", 401);
  }

  const workspace = await getSelectedWorkspaceContext(supabase);
  if (!workspace) {
    throw new AIGatewayAuthorizationError("AI_WORKSPACE_REQUIRED", 403);
  }

  const entitlement = await getWorkspaceEntitlementDecision({
    workspaceId: workspace.workspace_id,
  });
  if (!entitlement.decision.canAccess) {
    throw new AIGatewayAuthorizationError("AI_ENTITLEMENT_REQUIRED", 403);
  }

  return {
    actorId: user.id,
    workspaceId: workspace.workspace_id,
    workspaceOwnerId: workspace.workspace_owner_id,
    planId: entitlement.row.plan_id,
  };
}

function reservationPayload(data: unknown): AIUsageReservation {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("AI_USAGE_RESERVATION_INVALID");
  }
  const value = data as Record<string, unknown>;
  return {
    allowed: value.allowed === true,
    usageId: typeof value.usage_id === "string" ? value.usage_id : null,
    reason: typeof value.reason === "string" ? value.reason : null,
    retryAfterSeconds:
      typeof value.retry_after_seconds === "number"
        ? value.retry_after_seconds
        : null,
  };
}

export async function reserveAIUsage(input: {
  workspaceId: string;
  actorId: string;
  operation: AIOperationId;
  model: AIModel;
  inputChars: number;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  limits: AIPlanLimits;
}): Promise<AIUsageReservation> {
  const { data, error } = await getAdminClient().rpc("reserve_ai_usage", {
    p_workspace_id: input.workspaceId,
    p_actor_id: input.actorId,
    p_operation: input.operation,
    p_model: input.model,
    p_input_chars: input.inputChars,
    p_estimated_input_tokens: input.estimatedInputTokens,
    p_max_output_tokens: input.maxOutputTokens,
    p_requests_per_minute: input.limits.requestsPerMinute,
    p_requests_per_day: input.limits.requestsPerDay,
    p_requests_per_month: input.limits.requestsPerMonth,
    p_tokens_per_month: input.limits.tokensPerMonth,
    p_max_concurrency: input.limits.maxConcurrency,
  });
  if (error)
    throw new Error(`AI_USAGE_RESERVATION_FAILED:${error.code || "unknown"}`);
  return reservationPayload(data);
}

export async function completeAIUsage(input: {
  usageId: string;
  status: "succeeded" | "failed";
  inputTokens: number;
  outputTokens: number;
  errorCode: string | null;
}): Promise<void> {
  const { data, error } = await getAdminClient().rpc("finalize_ai_usage", {
    p_usage_id: input.usageId,
    p_status: input.status,
    p_input_tokens: input.inputTokens,
    p_output_tokens: input.outputTokens,
    p_error_code: input.errorCode,
  });
  if (error || data !== true) {
    throw new Error(
      `AI_USAGE_FINALIZATION_FAILED:${error?.code || "not_updated"}`,
    );
  }
}

export async function invokeAIProvider(input: {
  model: AIModel;
  systemPrompt: string;
  prompt: string;
  maxOutputTokens: number;
  timeoutMs: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("your-")) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }

  const response = await completion({
    api_key: apiKey,
    model: input.model,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.prompt },
    ],
    max_completion_tokens: input.maxOutputTokens,
    timeout: input.timeoutMs,
    stream: false,
  });

  return {
    content: response.choices[0]?.message.content || "",
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
  };
}

export const AI_GATEWAY_SERVER_DEPENDENCIES: AIGatewayDependencies = {
  reserve: reserveAIUsage,
  complete: completeAIUsage,
  invoke: invokeAIProvider,
};

export async function getAIUsageSummary(workspaceId: string) {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const { data, error } = await getAdminClient()
    .from("ai_usage_events")
    .select(
      "created_at,status,input_tokens,output_tokens,estimated_input_tokens,max_output_tokens",
    )
    .eq("workspace_id", workspaceId)
    .gte("created_at", monthStart.toISOString());
  if (error)
    throw new Error(`AI_USAGE_SUMMARY_FAILED:${error.code || "unknown"}`);

  let requestsToday = 0;
  let requestsThisMonth = 0;
  let tokensThisMonth = 0;
  for (const row of data || []) {
    if (row.status === "rejected") continue;
    requestsThisMonth += 1;
    if (Date.parse(row.created_at) >= dayStart.getTime()) requestsToday += 1;
    tokensThisMonth +=
      row.status === "reserved"
        ? (row.estimated_input_tokens || 0) + (row.max_output_tokens || 0)
        : (row.input_tokens || 0) + (row.output_tokens || 0);
  }

  return { requestsToday, requestsThisMonth, tokensThisMonth };
}
