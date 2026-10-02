import {
  handleCreditReportAnalysisGet,
  handleCreditReportAnalysisPost,
} from '@/lib/creditReport/reportAnalysisRoute';

export async function GET() {
  return handleCreditReportAnalysisGet();
}

export async function POST(request: Request) {
  return handleCreditReportAnalysisPost(request);
}
