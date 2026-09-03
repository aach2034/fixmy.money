import { NextResponse } from "next/server";
import {
  AIGatewayError,
  executeAIGatewayOperation,
  type AIGatewayDependencies,
} from "@/lib/ai/gateway";
import { readBoundedJson } from "@/lib/ai/chatRoute";
import {
  AI_GATEWAY_SERVER_DEPENDENCIES,
  AIGatewayAuthorizationError,
  authorizeAIGateway,
  isAIGatewayEnabled,
  type AIGatewayAuthorization,
} from "@/lib/ai/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  buildExternalReportPrompt,
  isReportAIProcessorPolicyApproved,
  minimizeReportForExternalAI,
  parseCreditReportAnalysisRequest,
} from "./aiPrivacy";
import { isStoredReportEligibleForAutomatedAnalysis } from "./analyzerOutcome";

type StoredReport = Record<string, unknown>;

export interface CreditReportAnalysisRouteDependencies {
  enabled(): boolean;
  processorPolicyApproved(): boolean;
  authorize(): Promise<AIGatewayAuthorization>;
  loadReport(input: { parsedReportId: string; workspaceOwnerId: string }): Promise<StoredReport | null>;
  gateway: AIGatewayDependencies;
}

async function loadStoredReport(input: {
  parsedReportId: string;
  workspaceOwnerId: string;
}): Promise<StoredReport | null> {
  const { data, error } = await getAdminClient()
    .from("parsed_credit_reports")
    .select("id,owner_id,provider,overall_confidence,scores,all_accounts,all_inquiries,public_records")
    .eq("id", input.parsedReportId)
    .eq("owner_id", input.workspaceOwnerId)
    .maybeSingle();
  if (error) throw new Error(`REPORT_AI_LOAD_FAILED:${error.code || "unknown"}`);
  return data as StoredReport | null;
}

const DEFAULT_DEPENDENCIES: CreditReportAnalysisRouteDependencies = {
  enabled: () => isAIGatewayEnabled() && process.env.CREDIT_REPORT_AI_ENABLED === "true",
  processorPolicyApproved: isReportAIProcessorPolicyApproved,
  authorize: authorizeAIGateway,
  loadReport: loadStoredReport,
  gateway: AI_GATEWAY_SERVER_DEPENDENCIES,
};

function unavailable(code: string, message: string) {
  return NextResponse.json(
    { error: message, code },
    {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "3600" },
    },
  );
}

export async function handleCreditReportAnalysisPost(
  request: Request,
  dependencies: CreditReportAnalysisRouteDependencies = DEFAULT_DEPENDENCIES,
) {
  if (!dependencies.enabled()) {
    return unavailable(
      "CREDIT_REPORT_AI_TEMPORARILY_DISABLED",
      "AI credit-report analysis is temporarily unavailable.",
    );
  }
  if (!dependencies.processorPolicyApproved()) {
    return unavailable(
      "REPORT_AI_PROCESSOR_POLICY_NOT_APPROVED",
      "The approved report-processing policy is not configured.",
    );
  }

  try {
    const analysisRequest = parseCreditReportAnalysisRequest(await readBoundedJson(request));
    const authorization = await dependencies.authorize();
    const report = await dependencies.loadReport({
      parsedReportId: analysisRequest.parsedReportId,
      workspaceOwnerId: authorization.workspaceOwnerId,
    });
    if (!report) {
      throw new AIGatewayError("REPORT_AI_REPORT_NOT_FOUND", 404, "Report not found or access denied.");
    }
    if (!isStoredReportEligibleForAutomatedAnalysis(report)) {
      throw new AIGatewayError(
        "REPORT_AI_REQUIRES_REVIEW",
        409,
        "The report is incomplete or below the automated-analysis confidence threshold.",
      );
    }

    const minimizedReport = minimizeReportForExternalAI(report);
    const result = await executeAIGatewayOperation({
      request: {
        operation: "credit_report_analysis",
        input: { prompt: buildExternalReportPrompt(minimizedReport) },
      },
      workspaceId: authorization.workspaceId,
      actorId: authorization.actorId,
      planId: authorization.planId,
      dependencies: dependencies.gateway,
    });

    return NextResponse.json(
      {
        analysis: result.content,
        schemaVersion: minimizedReport.schemaVersion,
        usage: result.usage,
        requiresHumanReview: true,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AIGatewayAuthorizationError) {
      return NextResponse.json(
        { error: "AI access denied.", code: error.code },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (error instanceof AIGatewayError) {
      const headers: Record<string, string> = { "Cache-Control": "private, no-store" };
      if (error.retryAfterSeconds) headers["Retry-After"] = String(error.retryAfterSeconds);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers },
      );
    }
    console.error("Credit-report AI analysis failed closed.");
    return NextResponse.json(
      { error: "Credit-report analysis could not be completed.", code: "REPORT_AI_FAILED" },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
      },
    );
  }
}
