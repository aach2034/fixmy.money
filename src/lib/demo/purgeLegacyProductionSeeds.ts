export const LEGACY_SEED_CLIENTS = [
  { name: 'Darnell Washington', email: 'darnell.w@gmail.com' },
  { name: 'Priya Nambiar', email: 'priya.nambiar@outlook.com' },
  { name: 'Marcus Holloway', email: 'm.holloway@yahoo.com' },
  { name: 'Tanisha Brooks', email: 'tanisha.b@gmail.com' },
  { name: 'Roberto Fuentes', email: 'rfuentes@gmail.com' },
  { name: 'Shaniqua Davis', email: 'shaniqua.d@hotmail.com' },
  { name: 'Adriana Morales', email: 'adriana.m@gmail.com' },
  { name: 'Jermaine Patterson', email: 'j.patterson@gmail.com' },
  { name: 'Keisha Thornton', email: 'keisha.t@yahoo.com' },
  { name: 'Devon Clarke', email: 'devon.c@gmail.com' },
  { name: 'Monique Simmons', email: 'monique.s@gmail.com' },
  { name: 'Tyler Nguyen', email: 'tyler.n@outlook.com' },
] as const;

export const LEGACY_SEED_LETTER_IDS = [
  'EQ-2847', 'TU-1923', 'EX-3341', 'EQ-2901', 'EX-3190', 'TU-1887',
  'EQ-2756', 'EX-3055', 'TU-2011', 'EQ-2799', 'EX-3280', 'TU-1955',
] as const;

const LEGACY_CLIENT_EMAILS = new Set<string>(LEGACY_SEED_CLIENTS.map(client => client.email));

export function isLegacySeedClient(client: { name?: string | null; email?: string | null }): boolean {
  if (!client.email || !LEGACY_CLIENT_EMAILS.has(client.email)) return false;
  return LEGACY_SEED_CLIENTS.some(seed => seed.email === client.email && seed.name === client.name);
}

/**
 * Removes the exact fictional rows that an early production migration attached
 * to the first real account. All predicates include the authenticated owner and
 * exact fixture identifiers, so genuine customer records are never selected.
 * This is intentionally idempotent and runs before dashboard data is loaded.
 */
export async function purgeLegacyProductionSeeds(supabase: any, ownerId: string): Promise<void> {
  const seededEmails = LEGACY_SEED_CLIENTS.map(client => client.email);

  await supabase
    .from('dispute_letters')
    .delete()
    .eq('owner_id', ownerId)
    .in('letter_id', [...LEGACY_SEED_LETTER_IDS]);

  await supabase
    .from('staff_clients')
    .delete()
    .eq('owner_id', ownerId)
    .in('email', seededEmails);

  await supabase
    .from('dashboard_metrics')
    .delete()
    .eq('owner_id', ownerId)
    .eq('active_clients', 147)
    .eq('disputes_in_flight', 84)
    .eq('items_deleted_mtd', 312)
    .eq('mrr', 24780);

  const chartFixtures = [
    ['Jan', 28, 34, 22], ['Feb', 31, 29, 27], ['Mar', 42, 38, 35],
    ['Apr', 38, 44, 31], ['May', 51, 47, 42], ['Jun', 44, 52, 38],
  ] as const;
  for (const [month, equifax, experian, transunion] of chartFixtures) {
    await supabase
      .from('disputes_by_bureau')
      .delete()
      .eq('owner_id', ownerId)
      .eq('month', month)
      .eq('equifax', equifax)
      .eq('experian', experian)
      .eq('transunion', transunion);
  }
}
