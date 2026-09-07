import { NextResponse } from "next/server";
import { resolveAIPlanLimits } from "@/lib/ai/gateway";
import {
  AIGatewayAuthorizationError,
  authorizeAIGateway,
  getAIUsageSummary,
  isAIGatewayEnabled,
} from "@/lib/ai/server";

const TEMPORARILY_UNAVAILABLE = {
  error: "AI features and usage tracking are temporarily unavailable.",
  code: "AI_TEMPORARILY_DISABLED",
} as const;

function unavailable() {
  return NextResponse.json(TEMPORARILY_UNAVAILABLE, {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": "3600",
    },
  });
}

export async function GET() {
  if (!isAIGatewayEnabled()) return unavailable();

  try {
    const authorization = await authorizeAIGateway();
    const limits = resolveAIPlanLimits(authorization.planId);
    const usage = await getAIUsageSummary(authorization.workspaceId);
    return NextResponse.json(
      { usage, limits },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
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
    console.error("AI usage lookup failed closed.");
    return NextResponse.json(
      { error: "AI usage is unavailable.", code: "AI_USAGE_FAILED" },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
      },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: "AI usage is server-recorded and read-only.",
      code: "AI_USAGE_READ_ONLY",
    },
    {
      status: 405,
      headers: { Allow: "GET", "Cache-Control": "private, no-store" },
    },
  );
}
