import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCanonicalDisputeLetter, type StoredNegativeItem } from '../lib/disputes/canonicalLetter';
import { deduplicateSupportingDocuments, requestedActionForIssueTypes } from '../lib/disputes/letterPresentation';
import {
  buildConsumerSenderBlock,
  formatMissingMailingAddressError,
  getLegacyMailingAddressBackfill,
  getLetterSenderInfo,
  letterContainsGeneratedDisclaimer,
  normalizeClientMailingAddress,
  toCanonicalMailingAddressUpdate,
} from '../lib/disputes/letterSender';

const sender = getLetterSenderInfo({
  name: 'Jordan Bennett',
  address: '123 Maple Street',
  city: 'Austin',
  state: 'tx',
  zip: '78701',
  phone: '(555) 100-0001',
  email: 'jordan@example.com',
});

const storedRows: StoredNegativeItem[] = [
  {
    id: 'item-equifax', owner_id: 'owner-test', client_id: 'client-test', report_id: 'report-test', credit_account_id: 'account-test',
    bureau: 'Equifax', creditor_name: '1ST DIGITAL/SYNOVUS/VT', furnisher_name: '1ST DIGITAL/SYNOVUS/VT',
    account_number_masked: '****8812', account_type: 'Collection Account', status: 'Open',
    balance: 1284, past_due: 0, date_opened: '2022-02-01', date_reported: '2026-08-01',
    negative_category: 'collection', negative_reason: 'Stored report flag', is_negative: true, is_collection: true,
    parser_confidence: 95,
  },
  {
    id: 'item-experian', owner_id: 'owner-test', client_id: 'client-test', report_id: 'report-test', credit_account_id: 'account-test',
    bureau: 'Experian', creditor_name: '1ST DIGITAL/SYNOVUS/VT', furnisher_name: '1ST DIGITAL/SYNOVUS/VT',
    account_number_masked: '****8812', account_type: 'Collection Account', status: 'Open',
    balance: 0, past_due: 0, date_opened: '2022-02-01', date_reported: '2026-08-01',
    negative_category: 'collection', negative_reason: 'Stored report flag', is_negative: true, is_collection: true,
    parser_confidence: 95,
  },
];

function canonicalLetter() {
  return buildCanonicalDisputeLetter({
    sender: sender!, bureau: 'Equifax', letterReference: 'EQ-1001', generatedOn: new Date('2026-09-13T12:00:00Z'),
    selectedEvidenceIds: ['item-equifax'], evidenceRows: storedRows,
  });
}

function senderBlockFrom(letter: string): string {
  return letter.split(/\n\n/)[0];
}

describe('dispute letter generation', () => {
  it('builds generated letters without the FixMy.Money disclaimer footer', () => {
    expect(sender).not.toBeNull();
    const letter = canonicalLetter().letterContent!;

    expect(letterContainsGeneratedDisclaimer(letter)).toBe(false);
    expect(letter).not.toContain('LETTER NOTICE');
    expect(letter).not.toContain('FixMy.Money generated this editable draft');
  });

  it('deduplicates equivalent supporting-document labels while preserving distinct documents', () => {
    expect(deduplicateSupportingDocuments([
      'Copy of government-issued photo ID',
      'Government-issued photo ID',
      'Proof of current address',
    ])).toEqual([
      'Copy of government-issued photo ID',
      'Proof of current address',
    ]);
  });

  it('maps each substantive paragraph to stored field-level provenance', () => {
    const result = canonicalLetter();
    expect(result.paragraphs).toHaveLength(1);
    expect(result.letterContent?.match(/Requested action:/g)).toHaveLength(1);
    expect(result.paragraphs[0]).toEqual(expect.objectContaining({
      disputedField: 'Current balance',
      sourceEvidenceIds: ['item-equifax', 'item-experian'],
    }));
  });

  it('keeps ordinary findings correction-first and deletion limited to existing obsolete-reporting logic', () => {
    expect(requestedActionForIssueTypes(['balance_discrepancy'])).toBe('Correct the inaccurate information');
    expect(requestedActionForIssueTypes(['past_due_discrepancy'])).toBe('Correct the inaccurate information');
    expect(requestedActionForIssueTypes(['account_type_discrepancy'])).toBe('Correct the inaccurate information');
    expect(requestedActionForIssueTypes(['status_discrepancy'])).toBe('Correct the inaccurate information');
    expect(requestedActionForIssueTypes(['date_discrepancy'])).toBe('Correct the inaccurate information');
    expect(requestedActionForIssueTypes(['potentially_obsolete_reporting'])).toBe('Delete this item from my credit report');
  });

  it('does not invent a legal deadline, violation, or template-specific allegation', () => {
    const letter = canonicalLetter().letterContent!;
    expect(letter).not.toMatch(/within 30 days|required by law|civil liability|legal violation|identity theft|fraud/i);
  });

  it('uses the selected client profile for the consumer sender identity', () => {
    expect(sender).not.toBeNull();
    const block = buildConsumerSenderBlock(sender!);

    expect(block).toContain('Jordan Bennett');
    expect(block).toContain('123 Maple Street');
    expect(block).toContain('Austin, TX 78701');
    expect(block).not.toContain('Adam Hamilton');
  });

  it('allows address line 2 to be blank', () => {
    expect(getLetterSenderInfo({ name: 'Jordan Bennett', address: '123 Main St', address2: '', city: 'Atlanta', state: 'GA', zip: '30301' })).not.toBeNull();
  });

  it.each([
    ['street address', { address: '', city: 'Atlanta', state: 'GA', zip: '30301' }],
    ['city', { address: '123 Main St', city: '', state: 'GA', zip: '30301' }],
    ['state', { address: '123 Main St', city: 'Atlanta', state: '', zip: '30301' }],
    ['ZIP code', { address: '123 Main St', city: 'Atlanta', state: 'GA', zip: '' }],
  ])('identifies a missing %s', (field, profile) => {
    expect(formatMissingMailingAddressError({ name: 'Jordan Bennett', ...profile })).toBe(`Client mailing address is missing: ${field}.`);
  });

  it('normalizes legacy and nested address field shapes', () => {
    expect(normalizeClientMailingAddress({
      profile: { street_address: '123 Main St', address_line2: 'Apt 4', city: 'Atlanta', state_code: 'ga', postal_code: '30301' },
    })).toEqual({ street: '123 Main St', line2: 'Apt 4', city: 'Atlanta', state: 'GA', postalCode: '30301' });
    expect(normalizeClientMailingAddress({ address: '123 Main St\nAtlanta GA 30301' })).toEqual({
      street: '123 Main St', line2: '', city: 'Atlanta', state: 'GA', postalCode: '30301',
    });
  });

  it('backfills a complete legacy multiline address into canonical fields', () => {
    expect(getLegacyMailingAddressBackfill({ address: '123 Main St\nAtlanta GA 30301', city: '', state: '', zip: '' })).toEqual({
      address: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30301',
    });
  });

  it('never overwrites existing canonical city, state, or ZIP values', () => {
    expect(getLegacyMailingAddressBackfill({
      address: '123 Main St\nNew York NY 10001', city: 'Boston', state: 'MA', zip: '02108',
    })).toEqual({ address: '123 Main St', city: 'Boston', state: 'MA', zip: '02108' });
  });

  it('preserves ambiguous legacy address text and requests missing fields', () => {
    const profile = { address: 'Phone Number\n1ST DIGITAL/SYNOVUS/VT\tPO BOX 85650', city: '', state: '', zip: '' };
    expect(getLegacyMailingAddressBackfill(profile)).toBeNull();
    expect(formatMissingMailingAddressError(profile)).toBe('Client mailing address is missing: street address, city, state, ZIP code.');
  });

  it('rejects report labels as a street address even when city, state, and ZIP are present', () => {
    const profile = { address: 'Phone number\nComments', city: 'Stone Mountain', state: 'GA', zip: '30087' };
    expect(getLetterSenderInfo({ name: 'Jordan Bennett', ...profile })).toBeNull();
    expect(formatMissingMailingAddressError(profile)).toBe('Client mailing address is missing: street address.');
  });

  it('creates canonical persistence values from an edited profile', () => {
    expect(toCanonicalMailingAddressUpdate({ address: '456 Oak Ave', city: 'Charlotte', state: 'nc', zip: '28202' })).toEqual({
      address: '456 Oak Ave', city: 'Charlotte', state: 'NC', zip: '28202',
    });
  });

  it('reloads the exact canonical values returned after save', () => {
    const saved = { address: '456 Oak Ave', city: 'Charlotte', state: 'NC', zip: '28202' };
    expect(normalizeClientMailingAddress(saved)).toEqual({ street: '456 Oak Ave', line2: '', city: 'Charlotte', state: 'NC', postalCode: '28202' });
  });

  it('preserves apartments and ZIP+4 while parsing two-word cities with line breaks', () => {
    expect(getLegacyMailingAddressBackfill({ address: '123 Main St\nApt 4B\nNew York NY 10001-1234', city: '', state: '', zip: '' })).toEqual({
      address: '123 Main St\nApt 4B', city: 'New York', state: 'NY', zip: '10001-1234',
    });
  });

  it('uses newly persisted values when generation refetches the selected client', () => {
    const stale = { name: 'Jordan Bennett', address: '1 Old St', city: 'Austin', state: 'TX', zip: '78701' };
    const persisted = { ...stale, address: '99 New St', zip: '78702' };
    const refreshedSender = getLetterSenderInfo(persisted);
    expect(buildConsumerSenderBlock(refreshedSender!)).toContain('99 New St');
    expect(buildConsumerSenderBlock(refreshedSender!)).not.toContain('1 Old St');
  });

  it('keeps the selected client isolated when multiple clients exist', () => {
    const clients = [
      { id: 'a', name: 'First Client', address: '1 First St', city: 'Austin', state: 'TX', zip: '78701' },
      { id: 'b', name: 'Selected Client', address: '2 Second St', city: 'Charlotte', state: 'NC', zip: '28202' },
    ];
    const selected = getLetterSenderInfo(clients.find(client => client.id === 'b'));
    expect(buildConsumerSenderBlock(selected!)).toBe('Selected Client\n2 Second St\nCharlotte, NC 28202');
  });

  it('renders the exact normalized selected-client mailing address', () => {
    const normalized = getLetterSenderInfo({
      name: 'Jordan Bennett', address_line1: ' 123   Main St ', address_line2: ' Apt 4 ', city: ' Atlanta ', state_code: 'ga', postal_code: '30301',
    });
    expect(buildConsumerSenderBlock(normalized!)).toBe('Jordan Bennett\n123 Main St\nApt 4\nAtlanta, GA 30301');
  });

  it('omits missing or malformed phone numbers instead of using unrelated data', () => {
    const withoutPhone = getLetterSenderInfo({
      name: 'Jordan Bennett',
      address: '123 Maple Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      phone: 'Payment history text 30/60/90',
    });

    expect(withoutPhone).not.toBeNull();
    expect(withoutPhone?.phone).toBe('');
    expect(buildConsumerSenderBlock(withoutPhone!)).not.toContain('Payment history text');
  });

  it('keeps creditor names and bureau addresses out of the consumer sender block', () => {
    expect(sender).not.toBeNull();
    const letter = canonicalLetter().letterContent!;
    const header = senderBlockFrom(letter);

    expect(header).not.toContain('1ST DIGITAL/SYNOVUS/VT');
    expect(header).not.toContain('PO BOX 85650');
    expect(header).not.toContain('Equifax Information Services LLC');
    expect(header).not.toContain('P.O. Box 740256');
  });

  it('keeps bureau and creditor information in their intended sections', () => {
    expect(sender).not.toBeNull();
    const letter = canonicalLetter().letterContent!;

    expect(letter).toContain('Equifax Information Services LLC');
    expect(letter).toContain('P.O. Box 740256');
    expect(letter).toContain('1ST DIGITAL/SYNOVUS/VT — account ****8812');
  });

  it('does not keep hardcoded Adam Hamilton or disclaimer text in generator templates', () => {
    const files = [
      'src/app/dispute-letter-management/components/GenerateLetterForm.tsx',
      'src/app/dispute-wizard/components/DisputeWizardContent.tsx',
      'src/app/clients/[clientId]/disputes/[roundId]/components/DisputeRoundContent.tsx',
    ].map(file => readFileSync(path.join(process.cwd(), file), 'utf8'));

    for (const file of files) {
      expect(file).not.toContain('Adam Hamilton');
      expect(file).not.toContain('LETTER NOTICE');
      expect(file).not.toContain('FixMy.Money generated this editable draft');
    }
  });
});
