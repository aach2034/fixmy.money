import { describe, expect, it } from 'vitest';
import { evaluateOnboardingWorkflow, serverConnectPolicy } from '@/lib/onboarding/workflow';
import fs from 'node:fs';
import path from 'node:path';

const base = {
  profileExists: true,
  onboardingCompleted: false,
  companyRecorded: true,
  companyName: 'Agency LLC',
  ownerName: 'Owner Name',
  connectRequired: false,
  connectStatus: 'unavailable' as const,
};

describe('FMM-010 server-authoritative onboarding', () => {
  it('keeps incomplete company setup blocked', () => {
    expect(evaluateOnboardingWorkflow({ ...base, companyName: '' })).toMatchObject({
      state: 'incomplete', canComplete: false, nextStep: 'company',
    });
  });

  it('does not infer company completion from signup-prefilled text', () => {
    expect(evaluateOnboardingWorkflow({ ...base, companyRecorded: false })).toMatchObject({
      state: 'incomplete', canComplete: false, nextStep: 'company',
    });
  });

  it('allows the current explicitly unavailable optional Connect state', () => {
    expect(evaluateOnboardingWorkflow(base)).toMatchObject({
      state: 'resumable', canComplete: true, nextStep: 'finish', connectStatus: 'unavailable',
    });
  });

  it('fails closed when required Connect verification fails', () => {
    expect(evaluateOnboardingWorkflow({ ...base, connectRequired: true, connectStatus: 'failed' })).toMatchObject({
      state: 'failed', canComplete: false, nextStep: 'connect',
    });
  });

  it('resumes required Connect onboarding until authoritative completion', () => {
    expect(evaluateOnboardingWorkflow({ ...base, connectRequired: true, connectStatus: 'required_incomplete' })).toMatchObject({
      state: 'resumable', canComplete: false, nextStep: 'connect',
    });
  });

  it('accepts a server-confirmed completed Connect state', () => {
    expect(evaluateOnboardingWorkflow({ ...base, connectRequired: true, connectStatus: 'complete' })).toMatchObject({
      state: 'resumable', canComplete: true, nextStep: 'finish',
    });
  });

  it('does not trust an old completed flag when required state is no longer valid', () => {
    expect(evaluateOnboardingWorkflow({ ...base, onboardingCompleted: true, connectRequired: true, connectStatus: 'failed' })).toMatchObject({
      state: 'failed', canComplete: false,
    });
  });

  it('treats a stray production enable flag as required and failed closed', () => {
    expect(serverConnectPolicy({ STRIPE_CONNECT_ENABLED: 'true' })).toEqual({ required: true, status: 'failed' });
    expect(serverConnectPolicy({})).toEqual({ required: false, status: 'unavailable' });
  });

  it('routes completion through the authenticated server and protects the database transition', () => {
    const component = fs.readFileSync(path.resolve('src/app/onboarding/components/OnboardingContent.tsx'), 'utf8');
    const migration = fs.readFileSync(path.resolve('supabase/migrations/20260903235900_fmm_010_server_authoritative_onboarding.sql'), 'utf8');
    expect(component).toContain("fetch('/api/onboarding', { method: 'POST' })");
    expect(component).toContain("method: 'PUT'");
    expect(component).not.toContain("update({ onboarding_completed: true })");
    expect(migration).toContain('ONBOARDING_COMPLETION_REQUIRES_SERVER');
    expect(migration).toContain("auth.role()) IS DISTINCT FROM 'service_role'");
  });
});
