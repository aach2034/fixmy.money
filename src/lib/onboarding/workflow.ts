export type ConnectStatus = 'unavailable' | 'required_incomplete' | 'complete' | 'failed';

export interface OnboardingWorkflowInput {
  profileExists: boolean;
  onboardingCompleted: boolean;
  companyRecorded: boolean;
  companyName: string | null;
  ownerName: string | null;
  connectRequired: boolean;
  connectStatus: ConnectStatus;
}

export interface OnboardingWorkflowStatus {
  state: 'incomplete' | 'failed' | 'resumable' | 'completed';
  companyComplete: boolean;
  connectRequired: boolean;
  connectStatus: ConnectStatus;
  canComplete: boolean;
  nextStep: 'company' | 'connect' | 'finish' | 'done';
}

/** Pure, fail-closed policy used by the server route and focused tests. */
export function evaluateOnboardingWorkflow(input: OnboardingWorkflowInput): OnboardingWorkflowStatus {
  const companyComplete = input.profileExists
    && input.companyRecorded
    && Boolean(input.companyName?.trim())
    && Boolean(input.ownerName?.trim());
  const connectComplete = !input.connectRequired || input.connectStatus === 'complete';
  const failed = input.connectRequired && input.connectStatus === 'failed';
  const canComplete = companyComplete && connectComplete && !failed;

  if (input.onboardingCompleted) {
    return {
      state: canComplete ? 'completed' : 'failed',
      companyComplete,
      connectRequired: input.connectRequired,
      connectStatus: input.connectStatus,
      canComplete,
      nextStep: canComplete ? 'done' : companyComplete ? 'connect' : 'company',
    };
  }

  return {
    state: failed ? 'failed' : companyComplete ? 'resumable' : 'incomplete',
    companyComplete,
    connectRequired: input.connectRequired,
    connectStatus: input.connectStatus,
    canComplete,
    nextStep: !companyComplete ? 'company' : connectComplete ? 'finish' : 'connect',
  };
}

export function serverConnectPolicy(env: NodeJS.ProcessEnv = process.env): {
  required: boolean;
  status: ConnectStatus;
} {
  // Connect is intentionally unavailable until an authoritative account-status
  // integration is separately configured. A stray enable flag fails closed.
  if (env.STRIPE_CONNECT_ENABLED === 'true') {
    return { required: true, status: 'failed' };
  }
  return { required: false, status: 'unavailable' };
}
