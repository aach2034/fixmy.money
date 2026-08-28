import type { SupabaseClient } from '@supabase/supabase-js';
import { formatMissingMailingAddressError, getLetterSenderInfo } from '@/lib/disputes/letterSender';
import {
  buildCertifiedMailingDraft,
  createCertifiedMailIdempotencyKey,
  type CertifiedMailingDraft,
  type LetterSource,
} from './certifiedMailing';

interface LetterRecord {
  id: string;
  owner_id: string;
  client_id: string | null;
  round_id?: string | null;
  bureau: string;
}

interface ClientRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface CertifiedMailingContext {
  letter: LetterRecord;
  client: ClientRecord;
  draft: CertifiedMailingDraft;
  idempotencyKey: string;
}

export function parseLetterSource(value: unknown): LetterSource | null {
  return value === 'dispute_letters' || value === 'generated_dispute_letters' ? value : null;
}

export async function loadCertifiedMailingContext(params: {
  supabase: SupabaseClient;
  userId: string;
  letterId: string;
  letterSource: LetterSource;
  returnReceiptElectronic?: boolean;
}): Promise<{ context: CertifiedMailingContext | null; error: string | null; status: number }> {
  const { supabase, userId, letterId, letterSource } = params;
  const selectFields = letterSource === 'generated_dispute_letters'
    ? 'id, owner_id, client_id, round_id, bureau'
    : 'id, owner_id, client_id, bureau';

  const { data: letter, error: letterError } = await supabase
    .from(letterSource)
    .select(selectFields)
    .eq('id', letterId)
    .eq('owner_id', userId)
    .single();

  if (letterError || !letter) {
    return { context: null, error: 'Letter not found or access denied.', status: 404 };
  }

  const typedLetter = letter as unknown as LetterRecord;
  if (!typedLetter.client_id) {
    return { context: null, error: 'This letter is not linked to a client profile.', status: 422 };
  }

  const { data: client, error: clientError } = await supabase
    .from('staff_clients')
    .select('id, name, email, phone, address, city, state, zip')
    .eq('id', typedLetter.client_id)
    .eq('owner_id', userId)
    .single();

  if (clientError || !client) {
    return { context: null, error: 'Client profile not found or access denied.', status: 404 };
  }

  const sender = getLetterSenderInfo(client as ClientRecord);
  if (!sender) {
    return { context: null, error: formatMissingMailingAddressError(client as ClientRecord) ?? 'Client name is missing.', status: 422 };
  }

  const { draft, errors } = buildCertifiedMailingDraft({
    letterId,
    letterSource,
    bureau: typedLetter.bureau,
    sender,
    returnReceiptElectronic: params.returnReceiptElectronic,
  });
  if (!draft) return { context: null, error: errors.join('; '), status: 422 };

  return {
    context: {
      letter: typedLetter,
      client: client as ClientRecord,
      draft,
      idempotencyKey: createCertifiedMailIdempotencyKey({ userId, letterSource, letterId }),
    },
    error: null,
    status: 200,
  };
}
