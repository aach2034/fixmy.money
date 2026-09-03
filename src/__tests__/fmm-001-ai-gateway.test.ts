import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  handleAIChatPost,
  type AIChatRouteDependencies,
} from "@/lib/ai/chatRoute";
import {
  AIGatewayError,
  AI_INPUT_LIMIT_BYTES,
  AI_INPUT_LIMIT_CHARS,
  AI_MODEL_ALLOWLIST,
  AI_OPERATION_CATALOG,
  executeAIGatewayOperation,
  parseAIGatewayRequest,
  resolveAIPlanLimits,
  type AIGatewayDependencies,
  type AIGatewayRequest,
} from "@/lib/ai/gateway";

const request: AIGatewayRequest = {
  operation: "agency_assistant",
  input: { prompt: "Summarize the next workflow step." },
};

function dependencies(
  overrides: Partial<AIGatewayDependencies> = {},
): AIGatewayDependencies {
  return {
    reserve: vi.fn(async () => ({
      allowed: true,
      usageId: "00000000-0000-4000-8000-000000000001",
      reason: null,
      retryAfterSeconds: null,
    })),
    complete: vi.fn(async () => undefined),
    invoke: vi.fn(async () => ({
      content: "Safe response",
      inputTokens: 12,
      outputTokens: 8,
    })),
    ...overrides,
  };
}

describe("FMM-001 strict server-owned request contract", () => {
  it("accepts only the allowlisted operation and exact nested schema", () => {
    expect(parseAIGatewayRequest(request)).toEqual(request);
    expect(
      Object.values(AI_OPERATION_CATALOG).every((item) =>
        AI_MODEL_ALLOWLIST.includes(item.model),
      ),
    ).toBe(true);
  });

  it.each(["provider", "model", "messages", "parameters", "stream", "api_key"])(
    "rejects the legacy client-controlled %s field",
    (field) => {
      expect(() =>
        parseAIGatewayRequest({ ...request, [field]: "attacker-controlled" }),
      ).toThrowError(AIGatewayError);
    },
  );

  it("rejects unknown operations, extra input fields, invalid characters, and empty prompts", () => {
    expect(() =>
      parseAIGatewayRequest({ ...request, operation: "arbitrary_proxy" }),
    ).toThrowError(/Unknown AI operation/);
    expect(() =>
      parseAIGatewayRequest({
        ...request,
        input: { prompt: "ok", temperature: 2 },
      }),
    ).toThrowError(/Invalid operation input/);
    expect(() =>
      parseAIGatewayRequest({ ...request, input: { prompt: "\u0000" } }),
    ).toThrowError(AIGatewayError);
    expect(() =>
      parseAIGatewayRequest({ ...request, input: { prompt: "  " } }),
    ).toThrowError(AIGatewayError);
  });

  it("enforces both character and UTF-8 byte limits", () => {
    expect(() =>
      parseAIGatewayRequest({
        ...request,
        input: { prompt: "a".repeat(AI_INPUT_LIMIT_CHARS + 1) },
      }),
    ).toThrowError(/exceeds/);
    expect(() =>
      parseAIGatewayRequest({
        ...request,
        input: {
          prompt: "😀".repeat(Math.floor(AI_INPUT_LIMIT_BYTES / 4) + 1),
        },
      }),
    ).toThrowError(/exceeds/);
  });

  it("fails closed for an unknown or missing subscription plan", () => {
    expect(() => resolveAIPlanLimits(null)).toThrowError(/no AI allowance/);
    expect(() => resolveAIPlanLimits("attacker-plan")).toThrowError(
      /no AI allowance/,
    );
  });
});

describe("FMM-001 admission, invocation, and accounting", () => {
  it("reserves before invocation and uses only fixed server model parameters", async () => {
    const events: string[] = [];
    const deps = dependencies({
      reserve: vi.fn(async (input) => {
        events.push("reserve");
        expect(input.model).toBe("gpt-5.4-mini");
        expect(input.maxOutputTokens).toBe(512);
        expect(input.limits.maxConcurrency).toBe(1);
        return {
          allowed: true,
          usageId: "usage-1",
          reason: null,
          retryAfterSeconds: null,
        };
      }),
      invoke: vi.fn(async (input) => {
        events.push("invoke");
        expect(input).toMatchObject({
          model: "gpt-5.4-mini",
          prompt: request.input.prompt,
          maxOutputTokens: 512,
          timeoutMs: 25_000,
        });
        expect(input.systemPrompt).toContain(
          "Do not request or reproduce account numbers",
        );
        return { content: "Safe response", inputTokens: 12, outputTokens: 8 };
      }),
      complete: vi.fn(async (input) => {
        events.push("complete");
        expect(input).toMatchObject({
          status: "succeeded",
          inputTokens: 12,
          outputTokens: 8,
        });
      }),
    });

    const result = await executeAIGatewayOperation({
      request,
      workspaceId: "workspace-1",
      actorId: "actor-1",
      planId: "starter",
      dependencies: deps,
    });

    expect(events).toEqual(["reserve", "invoke", "complete"]);
    expect(result.usage.totalTokens).toBe(20);
  });

  it.each([
    ["AI_RATE_LIMIT", 429],
    ["AI_DAILY_QUOTA", 429],
    ["AI_MONTHLY_QUOTA", 429],
    ["AI_TOKEN_QUOTA", 429],
    ["AI_CONCURRENCY_LIMIT", 409],
  ] as const)("blocks %s before provider use", async (reason, status) => {
    const invoke = vi.fn(async () => ({
      content: "should not run",
      inputTokens: 1,
      outputTokens: 1,
    }));
    const complete = vi.fn(async () => undefined);
    const deps = dependencies({
      reserve: vi.fn(async () => ({
        allowed: false,
        usageId: null,
        reason,
        retryAfterSeconds: 17,
      })),
      invoke,
      complete,
    });

    await expect(
      executeAIGatewayOperation({
        request,
        workspaceId: "workspace-1",
        actorId: "actor-1",
        planId: "starter",
        dependencies: deps,
      }),
    ).rejects.toMatchObject({ code: reason, status, retryAfterSeconds: 17 });
    expect(invoke).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("records a failed attempt and returns no provider error details", async () => {
    const complete = vi.fn(async () => undefined);
    const deps = dependencies({
      invoke: vi.fn(async () => {
        throw new Error("secret upstream detail");
      }),
      complete,
    });

    await expect(
      executeAIGatewayOperation({
        request,
        workspaceId: "workspace-1",
        actorId: "actor-1",
        planId: "starter",
        dependencies: deps,
      }),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_FAILED", status: 503 });
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        errorCode: "AI_PROVIDER_FAILED",
      }),
    );
  });

  it("fails closed when successful usage cannot be finalized", async () => {
    const complete = vi.fn(async () => {
      throw new Error("database unavailable");
    });
    await expect(
      executeAIGatewayOperation({
        request,
        workspaceId: "workspace-1",
        actorId: "actor-1",
        planId: "starter",
        dependencies: dependencies({ complete }),
      }),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_FAILED", status: 503 });
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe("FMM-001 route abuse controls", () => {
  function routeDependencies(
    overrides: Partial<AIChatRouteDependencies> = {},
  ): AIChatRouteDependencies {
    return {
      enabled: () => true,
      authorize: async () => ({
        actorId: "actor-1",
        workspaceId: "workspace-1",
        planId: "starter",
      }),
      gateway: dependencies(),
      ...overrides,
    };
  }

  it("checks the kill switch before parsing or authorization", async () => {
    const authorize = vi.fn(async () => {
      throw new Error("must not run");
    });
    const response = await handleAIChatPost(
      new Request("http://localhost/api/ai/chat-completion", {
        method: "POST",
        body: "{bad json",
      }),
      routeDependencies({ enabled: () => false, authorize }),
    );
    expect(response.status).toBe(503);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("rejects an oversized declared body before authorization", async () => {
    const authorize = vi.fn(async () => ({
      actorId: "actor-1",
      workspaceId: "workspace-1",
      planId: "starter",
    }));
    const response = await handleAIChatPost(
      new Request("http://localhost/api/ai/chat-completion", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "999999",
        },
        body: JSON.stringify(request),
      }),
      routeDependencies({ authorize }),
    );
    expect(response.status).toBe(413);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("rejects client-selected models and returns no-cache success for an allowed request", async () => {
    const rejected = await handleAIChatPost(
      new Request("http://localhost/api/ai/chat-completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request, model: "attacker-model" }),
      }),
      routeDependencies(),
    );
    expect(rejected.status).toBe(400);

    const accepted = await handleAIChatPost(
      new Request("http://localhost/api/ai/chat-completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
      routeDependencies(),
    );
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get("cache-control")).toBe("private, no-store");
    expect((await accepted.json()).content).toBe("Safe response");
  });

  it("stops reading an oversized body even without a content-length header", async () => {
    const authorize = vi.fn(async () => ({
      actorId: "actor-1",
      workspaceId: "workspace-1",
      planId: "starter",
    }));
    const response = await handleAIChatPost(
      new Request("http://localhost/api/ai/chat-completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "agency_assistant",
          input: { prompt: "a".repeat(20_000) },
        }),
      }),
      routeDependencies({ authorize }),
    );
    expect(response.status).toBe(413);
    expect(authorize).not.toHaveBeenCalled();
  });
});

describe("FMM-001 database guardrails", () => {
  it("keeps admission atomic and service-role-only in the generated migration", () => {
    const migrations = path.resolve(process.cwd(), "supabase/migrations");
    const filename = fs
      .readdirSync(migrations)
      .find((name) => name.endsWith("fmm_001_ai_gateway_controls.sql"));
    expect(filename).toBeTruthy();
    const sql = fs.readFileSync(path.join(migrations, filename!), "utf8");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain(
      "REVOKE ALL ON TABLE public.ai_usage_events FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(sql).toContain("membership.status = 'active'");
    expect(sql).toContain("p_operation <> 'agency_assistant'");
    expect(sql).toContain("p_model <> 'gpt-5.4-mini'");
    expect(sql).toContain("v_concurrency >= p_max_concurrency");
    expect(sql).toContain("v_projected_tokens > p_tokens_per_month");
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.reserve_ai_usage[\s\S]*TO service_role/,
    );
  });
});
