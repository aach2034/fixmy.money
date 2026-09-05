import { describe, expect, it } from 'vitest';
import { isCollectionItem } from '../lib/creditReport/negativeItemClassification';

describe('negative item collection classification', () => {
  it('recognizes persisted collection flags', () => {
    expect(isCollectionItem({ isCollection: true, accountType: 'Open account' })).toBe(true);
  });

  it('recognizes legacy collection reasons when the persisted flag is false', () => {
    expect(isCollectionItem({
      isCollection: false,
      accountType: 'Open account',
      negativeReason: 'Collection account',
    })).toBe(true);
  });

  it('does not classify unrelated negative accounts as collections', () => {
    expect(isCollectionItem({
      isCollection: false,
      accountType: 'Revolving',
      negativeReason: 'Charge-off',
    })).toBe(false);
  });
});
