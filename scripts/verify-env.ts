/**
 * Environment Validation Script
 *
 * Verifies all required production environment variables are configured.
 * Reports configured/missing status WITHOUT revealing values.
 *
 * Run: npx tsx scripts/verify-env.ts
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'APP_URL',
];

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'OPENAI_API_KEY',
  'ADMIN_EMAILS',
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
];

function isConfigured(key: string): boolean {
  const val = process.env[key];
  return !!(val && val.trim() !== '' && !val.startsWith('your-') && !val.startsWith('YOUR_'));
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  FixMy.Money — Production Environment Validation');
console.log('═══════════════════════════════════════════════════════\n');

let allRequired = true;

console.log('REQUIRED VARIABLES:');
for (const key of REQUIRED_VARS) {
  const configured = isConfigured(key);
  if (!configured) allRequired = false;
  const status = configured ? '✅ CONFIGURED' : '❌ MISSING';
  console.log(`  ${status}  ${key}`);
}

console.log('\nOPTIONAL VARIABLES:');
for (const key of OPTIONAL_VARS) {
  const configured = isConfigured(key);
  const status = configured ? '✅ CONFIGURED' : '⚠️  NOT SET';
  console.log(`  ${status}  ${key}`);
}

console.log('\n═══════════════════════════════════════════════════════');

if (!allRequired) {
  console.log('❌ RESULT: MISSING REQUIRED VARIABLES — application will not function correctly\n');
  process.exit(1);
} else {
  console.log('✅ RESULT: All required environment variables are configured\n');
  process.exit(0);
}
