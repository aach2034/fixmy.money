const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SendEmailOptions {
  type:
    | 'trial_confirmation' |'subscription_started' |'renewal_reminder' |'analysis_complete' |'dispute_recommendations_ready' |'client_notification';
  to: string;
  name?: string;
  plan?: string;
  trialEndDate?: string;
  renewalDate?: string;
  amount?: string;
  // analysis_complete
  totalNegativeAccounts?: number;
  totalCollections?: number;
  totalLatePayments?: number;
  totalHardInquiries?: number;
  estimatedScoreImpact?: number;
  improvementOpportunities?: number;
  // dispute_recommendations_ready
  disputeCount?: number;
  highPriorityCount?: number;
  // client_notification
  clientName?: string;
  clientEmail?: string;
  assignedStaff?: string;
  clientPlan?: string;
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/send-email`;

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error(`[EmailService] Failed to send ${options.type} email:`, error);
    // Non-blocking: log but don't throw so processing continues
    return;
  }

  const result = await response.json();
  console.log(`[EmailService] Sent ${options.type} email to ${options.to}, id: ${result.id}`);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getPlanAmount(plan: string): string {
  const amounts: Record<string, string> = {
    starter: '39',
    professional: '99',
    agency: '199',
    // Legacy alias — kept for backward compatibility with existing Stripe subscriptions
    growth: '129',
  };
  return amounts[plan?.toLowerCase()] || '49';
}
