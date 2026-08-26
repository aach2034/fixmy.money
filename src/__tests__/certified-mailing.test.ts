import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LetterSenderInfo } from '../lib/disputes/letterSender';
import {
  assertNoDuplicateCertifiedMailing,
  buildCertifiedMailingDraft,
  createCertifiedMailIdempotencyKey,
  getBureauMailingAddress,
  getCertifiedMailSetupStatus,
  mapUspsTrackingStatus,
  quoteCertifiedMailing,
  validateMailingAddress,
} from '../lib/mailing/certifiedMailing';
import { parseLetterSource } from '../lib/mailing/certifiedMailingRecords';

const sender: LetterSenderInfo = {
  name: 'Jordan Bennett',
  address: '123 Maple Street',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  email: 'jordan@example.com',
  phone: '(555) 100-0001',
};

describe('certified mailing support', () => {
  it('builds USPS certified mailing data from the selected consumer profile and bureau destination', () => {
    const { draft, errors } = buildCertifiedMailingDraft({
      letterId: 'letter-1',
      letterSource: 'generated_dispute_letters',
      bureau: 'Equifax',
      sender,
    });

    expect(errors).toEqual([]);
    expect(draft?.senderAddress).toEqual({
      name: 'Jordan Bennett',
      street1: '123 Maple Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    });
    expect(draft?.destinationAddress.name).toBe('Equifax Information Services LLC');
    expect(draft?.destinationAddress.street1).toBe('P.O. Box 740256');
  });

  it('does not allow creditor data to become the consumer return address', () => {
    const { draft } = buildCertifiedMailingDraft({
      letterId: 'letter-2',
      letterSource: 'dispute_letters',
      bureau: 'Experian',
      sender,
    });

    expect(draft?.senderAddress.name).not.toContain('1ST DIGITAL/SYNOVUS/VT');
    expect(draft?.senderAddress.street1).not.toContain('PO BOX 85650');
    expect(draft?.destinationAddress.name).toBe('Experian');
    expect(draft?.destinationAddress.street1).toBe('P.O. Box 4500');
  });

  it('validates both sender and destination addresses before purchase', () => {
    expect(validateMailingAddress({
      name: 'Jordan Bennett',
      street1: '',
      city: 'Austin',
      state: 'Texas',
      zip: 'abc',
    })).toEqual([
      'street address is required',
      'state must be a two-letter code',
      'ZIP must be five digits or ZIP+4',
    ]);
  });

  it('returns setup-required instead of inventing a USPS quote when credentials are missing', () => {
    const { draft } = buildCertifiedMailingDraft({
      letterId: 'letter-3',
      letterSource: 'generated_dispute_letters',
      bureau: 'TransUnion',
      sender,
    });

    const quote = quoteCertifiedMailing(draft!, {});

    expect(quote.available).toBe(false);
    expect(quote.amountCents).toBeNull();
    expect(quote.setupRequired.length).toBeGreaterThan(0);
  });

  it('supports a test-mode quote without requiring live USPS postage purchase', () => {
    const { draft } = buildCertifiedMailingDraft({
      letterId: 'letter-4',
      letterSource: 'generated_dispute_letters',
      bureau: 'TransUnion',
      sender,
      returnReceiptElectronic: true,
    });

    const setup = getCertifiedMailSetupStatus({ USPS_CERTIFIED_MAIL_MODE: 'test' });
    const quote = quoteCertifiedMailing(draft!, { USPS_CERTIFIED_MAIL_MODE: 'test' });

    expect(setup.configured).toBe(true);
    expect(setup.mode).toBe('test');
    expect(quote.available).toBe(true);
    expect(quote.amountCents).toBe(1100);
  });

  it('prevents duplicate active certified mail purchases for the same letter', () => {
    expect(() => assertNoDuplicateCertifiedMailing({ status: 'label_created', tracking_number: 'TEST123' }))
      .toThrow('A certified mailing already exists for this letter.');
    expect(() => assertNoDuplicateCertifiedMailing(null)).not.toThrow();
  });

  it('maps tracking updates into persisted dispute-round delivery states', () => {
    expect(mapUspsTrackingStatus('Accepted at USPS Origin Facility')).toBe('in_transit');
    expect(mapUspsTrackingStatus('Delivered, Front Desk/Reception/Mail Room')).toBe('delivered');
    expect(mapUspsTrackingStatus('Notice Left - Available for Pickup')).toBe('delivery_issue');
  });

  it('uses stable idempotency keys for repeat purchase requests', () => {
    const first = createCertifiedMailIdempotencyKey({
      userId: 'user-1',
      letterSource: 'generated_dispute_letters',
      letterId: 'letter-5',
    });
    const second = createCertifiedMailIdempotencyKey({
      userId: 'user-1',
      letterSource: 'generated_dispute_letters',
      letterId: 'letter-5',
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^certified-mail-[a-f0-9]{24}$/);
  });

  it('accepts only the supported saved-letter sources', () => {
    expect(parseLetterSource('dispute_letters')).toBe('dispute_letters');
    expect(parseLetterSource('generated_dispute_letters')).toBe('generated_dispute_letters');
    expect(parseLetterSource('demo-mode')).toBeNull();
  });

  it('keeps USPS credentials and setup values out of client components', () => {
    const clientFiles = [
      'src/app/dispute-letter-management/components/DisputeLetterContent.tsx',
      'src/app/clients/[clientId]/disputes/[roundId]/components/DisputeRoundContent.tsx',
      'src/app/clients/[clientId]/letters/components/ClientLettersContent.tsx',
    ].map(file => readFileSync(path.join(process.cwd(), file), 'utf8'));

    for (const file of clientFiles) {
      expect(file).not.toContain('USPS_CLIENT_SECRET');
      expect(file).not.toContain('USPS_PAYMENT_ACCOUNT_ID');
      expect(file).not.toContain('USPS_CLIENT_ID');
    }
  });

  it('contains current bureau destinations for all three credit bureaus', () => {
    expect(getBureauMailingAddress('Equifax')?.zip).toBe('30374-0256');
    expect(getBureauMailingAddress('Experian')?.zip).toBe('75013');
    expect(getBureauMailingAddress('TransUnion')?.zip).toBe('19016');
  });
});
