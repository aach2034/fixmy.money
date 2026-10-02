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
  FMM002_DISCLOSURE_VERSION,
  isReportAIProcessorPolicyApproved,
  minimizeFindingsForExternalAI,
  minimizeReportForExternalAI,
  parseCreditReportAnalysisRequest,
} from "./aiPrivacy";
import { isStoredReportEligibleForAutomatedAnalysis } from "./analyzerOutcome";

type StoredReport = Record<string, unknown>;
type StoredFinding = Record<string, unknown>;

export interface CreditReportAnalysisRouteDependencies {
  enabled(): boolean;
  processorPolicyApproved(): boolean;
  actorAllowed(actorId: string): boolean;
  authorize(): Promise<AIGatewayAuthorization>;
  loadReport(input: { parsedReportId: string; workspaceOwnerId: string }): Promise<StoredReport | null>;
  loadFindings(input: { parsedReportId: string; workspaceOwnerId: string }): Promise<StoredFinding[]>;
  gateway: AIGatewayDependencies;
}

export function isCreditReportAIActorAllowed(
  actorId: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const allowed = (env.CREDIT_REPORT_AI_ALLOWED_ACTOR_IDS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return allowed.includes(actorId);
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

async function loadStoredFindings(input: {
  parsedReportId: string;
  workspaceOwnerId: string;
}): Promise<StoredFinding[]> {
  const admin = getAdminClient();
  const { data: snapshots, error: snapshotError } = await admin
    .from("report_snapshots")
    .select("id")
    .eq("parsed_report_id", input.parsedReportId)
    .eq("owner_id", input.workspaceOwnerId);
  if (snapshotError) throw new Error(`REPORT_AI_FINDINGS_LOAD_FAILED:${snapshotError.code || "unknown"}`);
  const snapshotIds = (snapshots ?? []).map(row => row.id);
  if (snapshotIds.length === 0) return [];

  const { data, error } = await admin
    .from("detected_issues")
    .select("issue_type,affected_bureaus,confidence_level,evidence_strength,evidence_currently_available,evidence_still_needed")
    .eq("owner_id", input.workspaceOwnerId)
    .in("report_snapshot_id", snapshotIds)
    .order("confidence_level", { ascending: false })
    .limit(8);
  if (error) throw new Error(`REPORT_AI_FINDINGS_LOAD_FAILED:${error.code || "unknown"}`);
  return (data ?? []) as StoredFinding[];
}

const DEFAULT_DEPENDENCIES: CreditReportAnalysisRouteDependencies = {
  enabled: () => isAIGatewayEnabled() && process.env.CREDIT_REPORT_AI_ENABLED === "true",
  processorPolicyApproved: isReportAIProcessorPolicyApproved,
  actorAllowed: isCreditReportAIActorAllowed,
  authorize: authorizeAIGateway,
  loadReport: loadStoredReport,
  loadFindings: loadStoredFindings,
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

export async function handleCreditReportAnalysisGet(
  dependencies: CreditReportAnalysisRouteDependencies = DEFAULT_DEPENDENCIES,
) {
  if (!dependencies.enabled() || !dependencies.processorPolicyApproved()) {
    return NextResponse.json(
      { available: false },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  try {
    const authorization = await dependencies.authorize();
    if (!dependencies.actorAllowed(authorization.actorId)) {
      return NextResponse.json(
        { available: false },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(
      {
        available: true,
        provider: "OpenAI",
        model: "gpt-5.4-mini",
        disclosureVersion: FMM002_DISCLOSURE_VERSION,
        dataScope: "Minimized categories, opaque finding references, and generic evidence references only.",
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AIGatewayAuthorizationError) {
      return NextResponse.json(
        { available: false },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(
      { available: false },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
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
    const authorization = await dependencies.authorize();
    if (!dependencies.actorAllowed(authorization.actorId)) {
      throw new AIGatewayError(
        "CREDIT_REPORT_AI_ACCOUNT_NOT_ALLOWED",
        403,
        "AI credit-report analysis is not enabled for this account.",
      );
    }
    const analysisRequest = parseCreditReportAnalysisRequest(await readBoundedJson(request));
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
    const findings = minimizeFindingsForExternalAI(await dependencies.loadFindings({
      parsedReportId: analysisRequest.parsedReportId,
      workspaceOwnerId: authorization.workspaceOwnerId,
    }));
    const result = await executeAIGatewayOperation({
      request: {
        operation: "credit_report_analysis",
        input: { prompt: buildExternalReportPrompt(minimizedReport, findings) },
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
        candidateFindingCount: findings.length,
        provider: "OpenAI",
        model: result.model,
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
