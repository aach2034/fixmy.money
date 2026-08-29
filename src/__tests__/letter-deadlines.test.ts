import { describe, expect, it } from 'vitest';
import { calendarDaysUntil } from '../lib/disputes/letterDeadlines';

describe('letter response deadlines', () => {
  const today = new Date(2026, 7, 28, 12);

  it('derives overdue days from the response date instead of a stale stored counter', () => {
    expect(calendarDaysUntil('2026-08-13', today)).toBe(-15);
  });

  it('returns current due-soon days', () => {
    expect(calendarDaysUntil('2026-09-03', today)).toBe(6);
  });

  it('does not treat drafts without a response date as due this week', () => {
    expect(calendarDaysUntil(null, today)).toBeNull();
  });
});
