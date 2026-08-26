export interface ConsumerProfileForLetter {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface LetterSenderInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
}

function clean(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function isValidConsumerPhone(value: unknown): boolean {
  const phone = clean(value);
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

export function getLetterSenderInfo(profile: ConsumerProfileForLetter | null | undefined): LetterSenderInfo | null {
  const name = clean(profile?.name);
  const address = clean(profile?.address);
  const city = clean(profile?.city);
  const state = clean(profile?.state).toUpperCase();
  const zip = clean(profile?.zip);
  const email = clean(profile?.email);
  const phone = isValidConsumerPhone(profile?.phone) ? clean(profile?.phone) : '';

  if (!name || !address || !city || state.length !== 2 || zip.length < 5) {
    return null;
  }

  return { name, address, city, state, zip, email, phone };
}

export function buildConsumerSenderBlock(sender: LetterSenderInfo): string {
  return [
    sender.name,
    sender.address,
    `${sender.city}, ${sender.state} ${sender.zip}`,
    sender.phone,
    sender.email,
  ].filter(Boolean).join('\n');
}

export function letterContainsGeneratedDisclaimer(letterContent: string): boolean {
  return /LETTER NOTICE:|FixMy\.Money generated this editable draft|Generated draft\s*[·-]\s*Review before sending/i.test(letterContent);
}
