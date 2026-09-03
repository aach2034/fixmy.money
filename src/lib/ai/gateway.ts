import type { PlanId } from "@/lib/stripe/plans";

export const AI_GATEWAY_BODY_LIMIT_BYTES = 12 * 1024;
export const AI_INPUT_LIMIT_CHARS = 4_000;
export const AI_INPUT_LIMIT_BYTES = 8_000;
export const AI_RESERVATION_TTL_SECONDS = 120;

export const AI_MODEL_ALLOWLIST = ["gpt-5.4-mini"] as const;
export type AIModel = (typeof AI_MODEL_ALLOWLIST)[number];

export const AI_OPERATION_IDS = ["agency_assistant"] as const;
export type AIOperationId = (typeof AI_OPERATION_IDS)[number];

interface AIOperationConfig {
  model: AIModel;
  maxOutputTokens: number;
  timeoutMs: number;
  systemPrompt: string;
}

export const AI_OPERATION_CATALOG: Record<AIOperationId, AIOperationConfig> = {
  agency_assistant: {
    model: "gpt-5.4-mini",
    maxOutputTokens: 512,
    timeoutMs: 25_000,
    systemPrompt: [
      "You are the FixMy.Money agency workflow assistant.",
      "Give concise operational guidance based only on the user prompt.",
      "Do not invent consumer facts, legal conclusions, credit outcomes, or completed actions.",
      "Do not request or reproduce account numbers, Social Security numbers, or report contents.",
    ].join(" "),
  },
};

export interface AIPlanLimits {
  requestsPerMinute: number;
  requestsPerDay: number;
  requestsPerMonth: number;
  tokensPerMonth: number;
  maxConcurrency: number;
}

export const AI_PLAN_LIMITS: Record<PlanId, AIPlanLimits> = {
  starter: {
    requestsPerMinute: 5,
    requestsPerDay: 20,
    requestsPerMonth: 300,
    tokensPerMonth: 120_000,
    maxConcurrency: 1,
  },
  professional: {
    requestsPerMinute: 10,
    requestsPerDay: 100,
    requestsPerMonth: 2_000,
    tokensPerMonth: 800_000,
    maxConcurrency: 2,
  },
  agency: {
    requestsPerMinute: 20,
    requestsPerDay: 300,
    requestsPerMonth: 6_000,
    tokensPerMonth: 2_000_000,
    maxConcurrency: 3,
  },
  enterprise: {
    requestsPerMinute: 30,
    requestsPerDay: 500,
    requestsPerMonth: 10_000,
    tokensPerMonth: 4_000_000,
    maxConcurrency: 4,
  },
};

export interface AIGatewayRequest {
  operation: AIOperationId;
  input: { prompt: string };
}

export interface AIUsageReservation {
  allowed: boolean;
  usageId: string | null;
  reason: string | null;
  retryAfterSeconds: number | null;
}

export interface AIProviderResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIGatewayDependencies {
  reserve(input: {
    workspaceId: string;
    actorId: string;
    operation: AIOperationId;
    model: AIModel;
    inputChars: number;
    estimatedInputTokens: number;
    maxOutputTokens: number;
    limits: AIPlanLimits;
  }): Promise<AIUsageReservation>;
  complete(input: {
    usageId: string;
    status: "succeeded" | "failed";
    inputTokens: number;
    outputTokens: number;
    errorCode: string | null;
  }): Promise<void>;
  invoke(input: {
    model: AIModel;
    systemPrompt: string;
    prompt: string;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<AIProviderResult>;
}

export class AIGatewayError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AIGatewayError";
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: string[],
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}

function isOperationId(value: unknown): value is AIOperationId {
  return (
    typeof value === "string" &&
    AI_OPERATION_IDS.includes(value as AIOperationId)
  );
}

export function resolveAIPlanLimits(planId: string | null): AIPlanLimits {
  if (!planId || !(planId in AI_PLAN_LIMITS)) {
    throw new AIGatewayError(
      "AI_PLAN_NOT_ALLOWED",
      403,
      "The selected plan has no AI allowance.",
    );
  }
  return AI_PLAN_LIMITS[planId as PlanId];
}

export function parseAIGatewayRequest(value: unknown): AIGatewayRequest {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["input", "operation"])) {
    throw new AIGatewayError(
      "AI_INVALID_REQUEST",
      400,
      "Expected only operation and input fields.",
    );
  }
  if (!isOperationId(value.operation)) {
    throw new AIGatewayError(
      "AI_OPERATION_NOT_ALLOWED",
      400,
      "Unknown AI operation.",
    );
  }
  if (!isPlainRecord(value.input) || !hasExactKeys(value.input, ["prompt"])) {
    throw new AIGatewayError(
      "AI_INVALID_REQUEST",
      400,
      "Invalid operation input.",
    );
  }
  if (typeof value.input.prompt !== "string") {
    throw new AIGatewayError("AI_INVALID_REQUEST", 400, "Prompt must be text.");
  }

  const prompt = value.input.prompt.trim();
  const inputBytes = new TextEncoder().encode(prompt).byteLength;
  if (
    !prompt ||
    prompt.length > AI_INPUT_LIMIT_CHARS ||
    inputBytes > AI_INPUT_LIMIT_BYTES
  ) {
    throw new AIGatewayError(
      "AI_INPUT_TOO_LARGE",
      413,
      "Prompt exceeds the operation limit.",
    );
  }
  if (/\u0000/.test(prompt)) {
    throw new AIGatewayError(
      "AI_INVALID_REQUEST",
      400,
      "Prompt contains invalid characters.",
    );
  }

  return { operation: value.operation, input: { prompt } };
}

export function estimateInputTokens(prompt: string): number {
  return Math.max(
    1,
    Math.ceil(new TextEncoder().encode(prompt).byteLength / 4),
  );
}

export async function executeAIGatewayOperation(input: {
  request: AIGatewayRequest;
  workspaceId: string;
  actorId: string;
  planId: string | null;
  dependencies: AIGatewayDependencies;
}): Promise<{
  operation: AIOperationId;
  model: AIModel;
  content: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}> {
  const operation = AI_OPERATION_CATALOG[input.request.operation];
  if (!AI_MODEL_ALLOWLIST.includes(operation.model)) {
    throw new AIGatewayError(
      "AI_MODEL_NOT_ALLOWED",
      503,
      "AI model configuration is invalid.",
    );
  }

  const estimatedInputTokens = estimateInputTokens(input.request.input.prompt);
  const reservation = await input.dependencies.reserve({
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    operation: input.request.operation,
    model: operation.model,
    inputChars: input.request.input.prompt.length,
    estimatedInputTokens,
    maxOutputTokens: operation.maxOutputTokens,
    limits: resolveAIPlanLimits(input.planId),
  });

  if (!reservation.allowed || !reservation.usageId) {
    throw new AIGatewayError(
      reservation.reason || "AI_LIMIT_REACHED",
      reservation.reason === "AI_CONCURRENCY_LIMIT" ? 409 : 429,
      "AI usage limit reached.",
      reservation.retryAfterSeconds || 60,
    );
  }

  try {
    const result = await input.dependencies.invoke({
      model: operation.model,
      systemPrompt: operation.systemPrompt,
      prompt: input.request.input.prompt,
      maxOutputTokens: operation.maxOutputTokens,
      timeoutMs: operation.timeoutMs,
    });
    if (!result.content || result.inputTokens < 0 || result.outputTokens < 0) {
      throw new Error("AI_PROVIDER_INVALID_RESPONSE");
    }
    await input.dependencies.complete({
      usageId: reservation.usageId,
      status: "succeeded",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      errorCode: null,
    });
    return {
      operation: input.request.operation,
      model: operation.model,
      content: result.content,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
      },
    };
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message === "AI_PROVIDER_INVALID_RESPONSE"
        ? "AI_PROVIDER_INVALID_RESPONSE"
        : "AI_PROVIDER_FAILED";
    try {
      await input.dependencies.complete({
        usageId: reservation.usageId,
        status: "failed",
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        errorCode,
      });
    } catch {
      // The reservation remains pessimistically counted when accounting finalization fails.
    }
    throw new AIGatewayError(errorCode, 503, "AI operation failed safely.");
  }
}
