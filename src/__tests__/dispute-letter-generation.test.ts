import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFallbackLetter } from '../app/dispute-letter-management/components/GenerateLetterForm';
import {
  buildConsumerSenderBlock,
  getLetterSenderInfo,
  letterContainsGeneratedDisclaimer,
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
