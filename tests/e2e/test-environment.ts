type Environment = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function isRequiredReleaseGate(environment: Environment): boolean {
  return environment.CI === 'true' || environment.FMM_RELEASE_GATE === '1';
}

export function validateAuthenticatedE2EEnvironment(
  environment: Environment,
  includeMember = false,
): string[] {
  const required = [
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'TEST_SUPABASE_URL',
    'TEST_SUPABASE_ANON_KEY',
    ...(includeMember
      ? ['TEST_MEMBER_EMAIL', 'TEST_MEMBER_PASSWORD', 'TEST_SUPABASE_SERVICE_ROLE_KEY']
      : []),
  ];
  const missing = required.filter((name) => !environment[name]);
  if (missing.length > 0) return missing;

  const applicationUrl = new URL(environment.PLAYWRIGHT_BASE_URL || 'http://localhost:4028');
  const supabaseUrl = new URL(environment.TEST_SUPABASE_URL!);
  if (!LOCAL_HOSTS.has(applicationUrl.hostname) || !LOCAL_HOSTS.has(supabaseUrl.hostname)) {
    throw new Error('Authenticated E2E is restricted to local application and Supabase hosts.');
  }
  if (supabaseUrl.protocol !== 'http:') {
    throw new Error('Authenticated E2E requires the isolated HTTP Supabase local stack.');
  }
  if (!environment.TEST_USER_EMAIL!.endsWith('@test.invalid')) {
    throw new Error('Authenticated E2E requires a reserved @test.invalid owner identity.');
  }
  if (includeMember && !environment.TEST_MEMBER_EMAIL!.endsWith('@test.invalid')) {
    throw new Error('Authenticated E2E requires a reserved @test.invalid member identity.');
  }

  return [];
}
