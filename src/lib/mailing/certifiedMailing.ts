import { createHash, randomUUID } from 'node:crypto';
import type { LetterSenderInfo } from '@/lib/disputes/letterSender';

export type LetterSource = 'dispute_letters' | 'generated_dispute_letters';

export interface MailingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface CertifiedMailingDraft {
  letterId: string;
  letterSource: LetterSource;
  bureau: string;
  serviceType: 'certified_mail';
  returnReceiptElectronic: boolean;
  senderAddress: MailingAddress;
  destinationAddress: MailingAddress;
}

export interface CertifiedMailSetupStatus {
  provider: 'usps';
  configured: boolean;
  mode: 'live' | 'test' | 'not_configured';
  requirements: string[];
}

export interface CertifiedMailQuote {
  available: boolean;
  provider: 'usps';
  mode: CertifiedMailSetupStatus['mode'];
  currency: 'USD';
  amountCents: number | null;
  setupRequired: string[];
  senderAddress: MailingAddress;
  destinationAddress: MailingAddress;
}

export type CertifiedMailingStatus =
  | 'not_mailed'
  | 'ready_for_purchase'
  | 'label_created'
  | 'in_transit'
  | 'delivered'
  | 'delivery_issue'
  | 'canceled';

const USPS_SETUP_REQUIREMENTS = [
  'USPS Developer Portal OAuth application credentials',
  'USPS Customer Onboarding Portal authorization for Addresses, Domestic Prices, Domestic Labels, and Tracking APIs',
  'USPS Ship enrollment with an Enterprise Payment Account or approved permit payment method',
  'Tracking authorization for mailpieces created under the account MID',
];

const BUREAU_ADDRESSES: Record<string, MailingAddress> = {
  equifax: {
    name: 'Equifax Information Services LLC',
    street1: 'P.O. Box 740256',
    city: 'Atlanta',
    state: 'GA',
    zip: '30374-0256',
  },
  experian: {
    name: 'Experian',
    street1: 'P.O. Box 4500',
    city: 'Allen',
    state: 'TX',
    zip: '75013',
  },
  transunion: {
    name: 'TransUnion LLC',
    street1: 'P.O. Box 2000',
    city: 'Chester',
    state: 'PA',
    zip: '19016',
  },
};

function clean(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function bureauKey(value: string): string {
  return clean(value).toLowerCase().replace(/\s+/g, '');
}

export function getBureauMailingAddress(bureau: string): MailingAddress | null {
  return BUREAU_ADDRESSES[bureauKey(bureau)] ?? null;
}

export function senderInfoToMailingAddress(sender: LetterSenderInfo): MailingAddress {
  return {
    name: sender.name,
    street1: sender.address,
    city: sender.city,
    state: sender.state,
    zip: sender.zip,
  };
}

export function validateMailingAddress(address: MailingAddress): string[] {
  const errors: string[] = [];
  if (!clean(address.name)) errors.push('name is required');
  if (!clean(address.street1)) errors.push('street address is required');
  if (!clean(address.city)) errors.push('city is required');
  if (!/^[A-Z]{2}$/.test(clean(address.state).toUpperCase())) errors.push('state must be a two-letter code');
  if (!/^\d{5}(?:-\d{4})?$/.test(clean(address.zip))) errors.push('ZIP must be five digits or ZIP+4');
  return errors;
}

export function buildCertifiedMailingDraft(params: {
  letterId: string;
  letterSource: LetterSource;
  bureau: string;
  sender: LetterSenderInfo;
  returnReceiptElectronic?: boolean;
}): { draft: CertifiedMailingDraft | null; errors: string[] } {
  const destinationAddress = getBureauMailingAddress(params.bureau);
  if (!destinationAddress) {
    return { draft: null, errors: [`No certified-mail destination is configured for bureau "${params.bureau}".`] };
  }

  const senderAddress = senderInfoToMailingAddress(params.sender);
  const errors = [
    ...validateMailingAddress(senderAddress).map(error => `sender ${error}`),
    ...validateMailingAddress(destinationAddress).map(error => `destination ${error}`),
  ];
  if (errors.length > 0) return { draft: null, errors };

  return {
    draft: {
      letterId: params.letterId,
      letterSource: params.letterSource,
      bureau: params.bureau,
      serviceType: 'certified_mail',
      returnReceiptElectronic: params.returnReceiptElectronic === true,
      senderAddress,
      destinationAddress,
    },
    errors: [],
  };
}

export function getCertifiedMailSetupStatus(env: NodeJS.ProcessEnv = process.env): CertifiedMailSetupStatus {
  if (env.USPS_CERTIFIED_MAIL_MODE === 'test') {
    return { provider: 'usps', configured: true, mode: 'test', requirements: [] };
  }

  const hasCredentials = Boolean(
    clean(env.USPS_CLIENT_ID)
    && clean(env.USPS_CLIENT_SECRET)
    && clean(env.USPS_PAYMENT_ACCOUNT_ID)
  );

  return {
    provider: 'usps',
    configured: hasCredentials,
    mode: hasCredentials ? 'live' : 'not_configured',
    requirements: hasCredentials ? [] : USPS_SETUP_REQUIREMENTS,
  };
}

export function quoteCertifiedMailing(
  draft: CertifiedMailingDraft,
  env: NodeJS.ProcessEnv = process.env
): CertifiedMailQuote {
  const setup = getCertifiedMailSetupStatus(env);

  if (!setup.configured) {
    return {
      available: false,
      provider: 'usps',
      mode: setup.mode,
      currency: 'USD',
      amountCents: null,
      setupRequired: setup.requirements,
      senderAddress: draft.senderAddress,
      destinationAddress: draft.destinationAddress,
    };
  }

  if (setup.mode === 'test') {
    return {
      available: true,
      provider: 'usps',
      mode: 'test',
      currency: 'USD',
      amountCents: draft.returnReceiptElectronic ? 1100 : 900,
      setupRequired: [],
      senderAddress: draft.senderAddress,
      destinationAddress: draft.destinationAddress,
    };
  }

  return {
    available: false,
    provider: 'usps',
    mode: 'live',
    currency: 'USD',
    amountCents: null,
    setupRequired: ['Live USPS certified-mail purchase must call USPS Addresses, Domestic Prices, Domestic Labels, and Tracking APIs with approved account credentials.'],
    senderAddress: draft.senderAddress,
    destinationAddress: draft.destinationAddress,
  };
}

export function createCertifiedMailIdempotencyKey(params: {
  userId: string;
  letterSource: LetterSource;
  letterId: string;
}): string {
  const digest = createHash('sha256')
    .update(`${params.userId}:${params.letterSource}:${params.letterId}`)
    .digest('hex')
    .slice(0, 24);
  return `certified-mail-${digest}`;
}

export function createTestCertifiedTrackingNumber(params: {
  idempotencyKey: string;
  bureau: string;
}): string {
  const digest = createHash('sha256')
    .update(`${params.idempotencyKey}:${params.bureau}`)
    .digest('hex')
    .slice(0, 18)
    .toUpperCase();
  return `TEST${digest}`;
}

export function createProviderLabelId(): string {
  return `test-label-${randomUUID()}`;
}

export function mapUspsTrackingStatus(status: string): CertifiedMailingStatus {
  const normalized = clean(status).toLowerCase();
  if (!normalized) return 'label_created';
  if (normalized.includes('delivered')) return 'delivered';
  if (normalized.includes('available for pickup') || normalized.includes('notice left')) return 'delivery_issue';
  if (normalized.includes('return to sender') || normalized.includes('undeliverable')) return 'delivery_issue';
  if (normalized.includes('cancel')) return 'canceled';
  if (normalized.includes('accept') || normalized.includes('transit') || normalized.includes('arriv') || normalized.includes('depart')) {
    return 'in_transit';
  }
  return 'label_created';
}

export function assertNoDuplicateCertifiedMailing(existing: { tracking_number?: string | null; status?: string | null } | null | undefined): void {
  if (!existing) return;
  const activeStatuses = new Set(['label_created', 'in_transit', 'delivered']);
  if (existing.tracking_number || activeStatuses.has(String(existing.status ?? ''))) {
    throw new Error('A certified mailing already exists for this letter.');
  }
}
