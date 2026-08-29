export interface ConsumerProfileForLetter {
  name?: string | null;
  address?: string | null;
  address_line1?: string | null;
  address1?: string | null;
  street_address?: string | null;
  address_line2?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  zip?: string | null;
  zip_code?: string | null;
  postal_code?: string | null;
  email?: string | null;
  phone?: string | null;
  profile?: ConsumerProfileForLetter | null;
}

export interface NormalizedClientMailingAddress {
  street: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export type MissingMailingAddressField = 'street address' | 'city' | 'state' | 'ZIP code';

export interface LetterSenderInfo {
  name: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
}

function clean(value: unknown): string {
  return String(value ?? '').trim().replace(/[ \t]+/g, ' ');
}

function first(...values: unknown[]): string {
  return values.map(clean).find(Boolean) ?? '';
}

function parseLegacyAddressBlock(value: string): Partial<NormalizedClientMailingAddress> {
  const lines = value.split(/\r?\n/).map(clean).filter(Boolean);
  if (lines.length < 2 || lines.length > 3) return {};
  if (!/^(?:\d+\s+\S|P\.?\s*O\.?\s+Box\s+\d+)/i.test(lines[0])) return {};
  if (lines.length === 3 && !/^(?:Apt|Apartment|Unit|Suite|Ste|#)\b/i.test(lines[1])) return {};
  const match = (lines.at(-1) ?? '').match(/^([A-Za-z][A-Za-z .'-]*?)(?:,|\s+)\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) return {};
  return {
    street: lines[0],
    line2: lines.length === 3 ? lines[1] : '',
    city: clean(match[1]),
    state: clean(match[2]).toUpperCase(),
    postalCode: clean(match[3]),
  };
}

export function normalizeClientMailingAddress(profile: ConsumerProfileForLetter | null | undefined): NormalizedClientMailingAddress {
  const nested = profile?.profile ?? undefined;
  const rawStreet = first(
    profile?.address_line1, profile?.address1, profile?.street_address, profile?.address,
    nested?.address_line1, nested?.address1, nested?.street_address, nested?.address,
  );
  const legacy = parseLegacyAddressBlock(rawStreet);
  return {
    street: clean(legacy.street ?? rawStreet),
    line2: first(profile?.address_line2, profile?.address2, nested?.address_line2, nested?.address2, legacy.line2),
    city: first(profile?.city, nested?.city, legacy.city),
    state: first(profile?.state, profile?.state_code, nested?.state, nested?.state_code, legacy.state).toUpperCase(),
    postalCode: first(profile?.zip, profile?.zip_code, profile?.postal_code, nested?.zip, nested?.zip_code, nested?.postal_code, legacy.postalCode),
  };
}

export interface CanonicalMailingAddressUpdate {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export function toCanonicalMailingAddressUpdate(profile: ConsumerProfileForLetter): CanonicalMailingAddressUpdate | null {
  if (getMissingMailingAddressFields(profile).length > 0) return null;
  const normalized = normalizeClientMailingAddress(profile);
  return {
    address: [normalized.street, normalized.line2].filter(Boolean).join('\n'),
    city: normalized.city,
    state: normalized.state,
    zip: normalized.postalCode,
  };
}

export function getLegacyMailingAddressBackfill(profile: ConsumerProfileForLetter): CanonicalMailingAddressUpdate | null {
  const rawAddress = clean(profile.address);
  const legacy = parseLegacyAddressBlock(rawAddress);
  if (!legacy.street || !legacy.city || !legacy.state || !legacy.postalCode) return null;

  const merged: ConsumerProfileForLetter = {
    ...profile,
    address: legacy.street,
    address_line2: legacy.line2,
    city: first(profile.city, legacy.city),
    state: first(profile.state, legacy.state),
    zip: first(profile.zip, legacy.postalCode),
  };
  const update = toCanonicalMailingAddressUpdate(merged);
  if (!update) return null;

  const currentCanonical = {
    address: rawAddress,
    city: clean(profile.city),
    state: clean(profile.state).toUpperCase(),
    zip: clean(profile.zip),
  };
  return JSON.stringify(currentCanonical) === JSON.stringify(update) ? null : update;
}

export function getMissingMailingAddressFields(profile: ConsumerProfileForLetter | null | undefined): MissingMailingAddressField[] {
  const address = normalizeClientMailingAddress(profile);
  const missing: MissingMailingAddressField[] = [];
  if (!address.street) missing.push('street address');
  if (!address.city) missing.push('city');
  if (!/^[A-Z]{2}$/.test(address.state)) missing.push('state');
  if (!/^\d{5}(?:-\d{4})?$/.test(address.postalCode)) missing.push('ZIP code');
  return missing;
}

export function formatMissingMailingAddressError(profile: ConsumerProfileForLetter | null | undefined): string | null {
  const missing = getMissingMailingAddressFields(profile);
  return missing.length > 0 ? `Client mailing address is missing: ${missing.join(', ')}.` : null;
}

export function isValidConsumerPhone(value: unknown): boolean {
  const phone = clean(value);
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

export function getLetterSenderInfo(profile: ConsumerProfileForLetter | null | undefined): LetterSenderInfo | null {
  const nested = profile?.profile ?? undefined;
  const name = first(profile?.name, nested?.name);
  const address = normalizeClientMailingAddress(profile);
  const email = first(profile?.email, nested?.email);
  const rawPhone = first(profile?.phone, nested?.phone);
  const phone = isValidConsumerPhone(rawPhone) ? rawPhone : '';

  if (!name || getMissingMailingAddressFields(profile).length > 0) return null;

  return { name, address: address.street, address2: address.line2, city: address.city, state: address.state, zip: address.postalCode, email, phone };
}

export function buildConsumerSenderBlock(sender: LetterSenderInfo): string {
  return [
    sender.name,
    sender.address,
    sender.address2,
    `${sender.city}, ${sender.state} ${sender.zip}`,
    sender.phone,
    sender.email,
  ].filter(Boolean).join('\n');
}

export function letterContainsGeneratedDisclaimer(letterContent: string): boolean {
  return /LETTER NOTICE:|FixMy\.Money generated this editable draft|Generated draft\s*[·-]\s*Review before sending/i.test(letterContent);
}
