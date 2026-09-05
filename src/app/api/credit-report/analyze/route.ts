import { handleCreditReportAnalysisPost } from '@/lib/creditReport/reportAnalysisRoute';

export async function POST(request: Request) {
  return handleCreditReportAnalysisPost(request);
}
