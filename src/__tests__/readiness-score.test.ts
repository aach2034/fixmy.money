import { describe, expect, it } from 'vitest';
import { calculateReadiness } from '@/lib/disputes/readinessScore';

describe('deterministic dispute-readiness scoring', () => {
  it('marks a documented contradiction ready without claiming an outcome', () => {
    expect(calculateReadiness({
      clearDocumentContradiction: true,
      crossBureauMismatch: true,
      hasSupportingEvidence: true,
    })).toMatchObject({ score: 50, status: 'ready_to_dispute' });
  });

  it('requires evidence for a general denial', () => {
    expect(calculateReadiness({ generalDenialOnly: true, hasSupportingEvidence: false }))
      .toMatchObject({ score: 0, status: 'needs_evidence' });
  });

  it('never recommends disputing information that appears accurate', () => {
    expect(calculateReadiness({ appearsAccurate: true, clearDocumentContradiction: true }))
      .toMatchObject({ score: 0, status: 'not_recommended' });
  });
});
