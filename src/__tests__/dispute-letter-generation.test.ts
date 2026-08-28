import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFallbackLetter } from '../app/dispute-letter-management/components/GenerateLetterForm';
import {
  buildConsumerSenderBlock,
  formatMissingMailingAddressError,
  getLetterSenderInfo,
  letterContainsGeneratedDisclaimer,
  normalizeClientMailingAddress,
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

const disputeItem = {
  id: 'item-1',
  label: '1ST DIGITAL/SYNOVUS/VT - Collection Account',
  type: 'Collection Account',
  amount: '$1,284',
  bureau: 'Equifax',
  disputeReason: 'Incorrect balance',
  template: 'FCRA Section 611',
  creditorName: '1ST DIGITAL/SYNOVUS/VT',
  accountNumber: '****8812',
  reportingStatus: 'Paid/Closed',
  strongestAnomaly: 'A tradeline that appears paid, settled, or closed is also reporting a positive balance.',
  reportedDataSummary: 'Status and Current Balance: Equifax: Status: Paid/Closed; Current Balance: $1,284.',
  disputeBasis: 'The account is being reported with a paid, settled, or closed status while also carrying a positive outstanding balance.',
  isRecommended: true,
  dateOpened: '2022-02-01',
  dateReported: '2026-08-01',
  dateLastActivity: '',
  source: 'negative_items' as const,
};

function senderBlockFrom(letter: string): string {
  return letter.split(/\n\n/)[0];
}

describe('dispute letter generation', () => {
  it('builds generated letters without the FixMy.Money disclaimer footer', () => {
    expect(sender).not.toBeNull();
    const letter = buildFallbackLetter({
      sender: sender!,
      bureau: 'Equifax',
      template: 'FCRA Section 611',
      round: 1,
      items: [disputeItem],
      notes: '',
      letterId: 'EQ-1001',
    });

    expect(letterContainsGeneratedDisclaimer(letter)).toBe(false);
    expect(letter).not.toContain('LETTER NOTICE');
    expect(letter).not.toContain('FixMy.Money generated this editable draft');
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
    const letter = buildFallbackLetter({
      sender: sender!,
      bureau: 'Equifax',
      template: 'FCRA Section 611',
      round: 1,
      items: [disputeItem],
      notes: '',
      letterId: 'EQ-1001',
    });
    const header = senderBlockFrom(letter);

    expect(header).not.toContain('1ST DIGITAL/SYNOVUS/VT');
    expect(header).not.toContain('PO BOX 85650');
    expect(header).not.toContain('Equifax Information Services LLC');
    expect(header).not.toContain('P.O. Box 740256');
  });

  it('keeps bureau and creditor information in their intended sections', () => {
    expect(sender).not.toBeNull();
    const letter = buildFallbackLetter({
      sender: sender!,
      bureau: 'Equifax',
      template: 'FCRA Section 611',
      round: 1,
      items: [disputeItem],
      notes: '',
      letterId: 'EQ-1001',
    });

    expect(letter).toContain('Equifax Information Services LLC');
    expect(letter).toContain('P.O. Box 740256');
    expect(letter).toContain('Creditor / Furnisher: 1ST DIGITAL/SYNOVUS/VT');
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
