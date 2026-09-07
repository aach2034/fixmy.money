import { NextResponse } from "next/server";
import {
  AIGatewayError,
  AI_GATEWAY_BODY_LIMIT_BYTES,
  executeAIGatewayOperation,
  parseAIGatewayRequest,
  type AIGatewayDependencies,
} from "./gateway";
import {
  AI_GATEWAY_SERVER_DEPENDENCIES,
  AIGatewayAuthorizationError,
  authorizeAIGateway,
  isAIGatewayEnabled,
  type AIGatewayAuthorization,
} from "./server";

const TEMPORARILY_UNAVAILABLE = {
  error:
    "AI features are temporarily unavailable while additional privacy and usage controls are completed.",
  code: "AI_TEMPORARILY_DISABLED",
} as const;

export interface AIChatRouteDependencies {
  enabled(): boolean;
  authorize(): Promise<AIGatewayAuthorization>;
  gateway: AIGatewayDependencies;
}

const DEFAULT_DEPENDENCIES: AIChatRouteDependencies = {
  enabled: isAIGatewayEnabled,
  authorize: authorizeAIGateway,
  gateway: AI_GATEWAY_SERVER_DEPENDENCIES,
};

function unavailable() {
  return NextResponse.json(TEMPORARILY_UNAVAILABLE, {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "3600" },
  });
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AIGatewayError(
      "AI_UNSUPPORTED_MEDIA_TYPE",
      415,
      "Request body must use application/json.",
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > AI_GATEWAY_BODY_LIMIT_BYTES
  ) {
    throw new AIGatewayError(
      "AI_REQUEST_TOO_LARGE",
      413,
      "Request exceeds the gateway limit.",
    );
  }

  if (!request.body) {
    throw new AIGatewayError(
      "AI_INVALID_REQUEST",
      400,
      "Request body must be valid JSON.",
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > AI_GATEWAY_BODY_LIMIT_BYTES) {
      await reader.cancel();
      throw new AIGatewayError(
        "AI_REQUEST_TOO_LARGE",
        413,
        "Request exceeds the gateway limit.",
      );
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AIGatewayError(
      "AI_INVALID_REQUEST",
      400,
      "Request body must be valid JSON.",
    );
  }
}

export async function handleAIChatPost(
  request: Request,
  dependencies: AIChatRouteDependencies = DEFAULT_DEPENDENCIES,
) {
  if (!dependencies.enabled()) return unavailable();

  try {
    const gatewayRequest = parseAIGatewayRequest(
      await readBoundedJson(request),
    );
    const authorization = await dependencies.authorize();
    const result = await executeAIGatewayOperation({
      request: gatewayRequest,
      workspaceId: authorization.workspaceId,
      actorId: authorization.actorId,
      planId: authorization.planId,
      dependencies: dependencies.gateway,
    });
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AIGatewayAuthorizationError) {
      return NextResponse.json(
        { error: "AI access denied.", code: error.code },
        {
          status: error.status,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    if (error instanceof AIGatewayError) {
      const headers: Record<string, string> = {
        "Cache-Control": "private, no-store",
      };
      if (error.retryAfterSeconds)
        headers["Retry-After"] = String(error.retryAfterSeconds);
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers,
        },
      );
    }
    console.error("AI gateway failed closed.");
    return NextResponse.json(
      {
        error: "AI request could not be completed.",
        code: "AI_GATEWAY_FAILED",
      },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
      },
    );
  }
}
