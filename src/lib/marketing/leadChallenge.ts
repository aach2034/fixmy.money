export type LeadChallengeState = {
  phase: 'idle' | 'required' | 'retrying';
  widgetGeneration: number;
  retryCount: number;
};

export type LeadChallengeAction =
  | { type: 'challenge_required' }
  | { type: 'token_received' }
  | { type: 'challenge_rejected' }
  | { type: 'challenge_expired' }
  | { type: 'resolved' };

export const initialLeadChallengeState: LeadChallengeState = {
  phase: 'idle',
  widgetGeneration: 0,
  retryCount: 0,
};

type RuntimeConfigRoot = {
  getAttribute(name: string): string | null;
};

export function getRuntimeTurnstileSiteKey(
  root?: RuntimeConfigRoot | null,
): string {
  const runtimeRoot = root === undefined && typeof document !== 'undefined'
    ? document.documentElement
    : root;
  return (
    runtimeRoot?.getAttribute('data-turnstile-site-key')?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    ''
  );
}

export function leadChallengeReducer(
  state: LeadChallengeState,
  action: LeadChallengeAction,
): LeadChallengeState {
  switch (action.type) {
    case 'challenge_required':
      return state.phase === 'idle' ? { ...state, phase: 'required' } : state;
    case 'token_received':
      return state.phase === 'required'
        ? { ...state, phase: 'retrying', retryCount: state.retryCount + 1 }
        : state;
    case 'challenge_rejected':
    case 'challenge_expired':
      return {
        ...state,
        phase: 'required',
        widgetGeneration: state.widgetGeneration + 1,
      };
    case 'resolved':
      return initialLeadChallengeState;
  }
}
