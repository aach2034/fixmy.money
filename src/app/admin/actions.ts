'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import { getAdminClient } from '@/lib/supabase/admin';

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

async function assertCustomerExists(customerId: string) {
  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .select('id')
    .eq('id', customerId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Customer not found.');
  }
}

export async function addAdminNote(formData: FormData) {
  const { user } = await requirePlatformAdmin();
  const customerId = readString(formData, 'customerId');
  const noteText = readString(formData, 'noteText');

  if (!customerId || !noteText) return;
  await assertCustomerExists(customerId);

  const admin = getAdminClient();
  const { error } = await admin.from('admin_customer_notes').insert({
    customer_id: customerId,
    admin_id: user.id,
    note_text: noteText,
  });
  if (error) throw error;

  await admin.from('admin_action_audit_logs').insert({
    admin_id: user.id,
    customer_id: customerId,
    action: 'admin_note_added',
    metadata: { note_length: noteText.length },
  });

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function createFollowUp(formData: FormData) {
  const { user } = await requirePlatformAdmin();
  const customerId = readString(formData, 'customerId');
  const description = readString(formData, 'description');
  const dueDate = readString(formData, 'dueDate');

  if (!customerId || !description || !dueDate) return;
  await assertCustomerExists(customerId);

  const admin = getAdminClient();
  const { error } = await admin.from('admin_follow_up_tasks').insert({
    customer_id: customerId,
    admin_id: user.id,
    description,
    due_date: dueDate,
  });
  if (error) throw error;

  await admin.from('admin_action_audit_logs').insert({
    admin_id: user.id,
    customer_id: customerId,
    action: 'admin_follow_up_created',
    metadata: { due_date: dueDate },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function toggleFollowUp(formData: FormData) {
  const { user } = await requirePlatformAdmin();
  const customerId = readString(formData, 'customerId');
  const followUpId = readString(formData, 'followUpId');
  const completed = readString(formData, 'completed') !== 'true';

  if (!customerId || !followUpId) return;
  await assertCustomerExists(customerId);

  const admin = getAdminClient();
  const { error } = await admin
    .from('admin_follow_up_tasks')
    .update({ completed })
    .eq('id', followUpId)
    .eq('customer_id', customerId);
  if (error) throw error;

  await admin.from('admin_action_audit_logs').insert({
    admin_id: user.id,
    customer_id: customerId,
    action: completed ? 'admin_follow_up_completed' : 'admin_follow_up_reopened',
    metadata: { follow_up_id: followUpId },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function customerSearch(formData: FormData) {
  const q = readString(formData, 'q');
  const status = readString(formData, 'status') || 'all';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status !== 'all') params.set('status', status);
  redirect(`/admin/customers${params.size ? `?${params.toString()}` : ''}`);
}
