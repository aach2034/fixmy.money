'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import type { AlertStatus, CustomerType } from '@/lib/admin/customerManagement';
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

function validateCustomerType(value: string): CustomerType {
  if (['real', 'internal', 'qa', 'demo', 'test'].includes(value)) return value as CustomerType;
  throw new Error('Invalid customer type.');
}

function validateAlertStatus(value: string): AlertStatus {
  if (['active', 'dismissed', 'contacted', 'snoozed'].includes(value)) return value as AlertStatus;
  throw new Error('Invalid alert status.');
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

export async function updateRetentionAlert(formData: FormData) {
  const { user } = await requirePlatformAdmin();
  const customerId = readString(formData, 'customerId');
  const alertKey = readString(formData, 'alertKey');
  const status = validateAlertStatus(readString(formData, 'status'));
  const reason = readString(formData, 'reason');
  const snoozeDaysValue = Number.parseInt(readString(formData, 'snoozeDays') || '3', 10);
  const snoozeDays = Number.isFinite(snoozeDaysValue) && snoozeDaysValue > 0 ? Math.min(snoozeDaysValue, 90) : 3;

  if (!customerId || !alertKey) return;
  await assertCustomerExists(customerId);

  const snoozedUntil = status === 'snoozed' ? new Date(Date.now() + snoozeDays * 86_400_000).toISOString().slice(0, 10) : null;
  const admin = getAdminClient();
  const { error } = await admin.from('admin_retention_alert_states').upsert(
    {
      customer_id: customerId,
      alert_key: alertKey,
      status,
      snoozed_until: snoozedUntil,
      reason: reason || null,
      admin_id: user.id,
    },
    { onConflict: 'customer_id,alert_key' }
  );
  if (error) throw error;

  await admin.from('admin_action_audit_logs').insert({
    admin_id: user.id,
    customer_id: customerId,
    action: `admin_retention_alert_${status}`,
    metadata: { alert_key: alertKey, reason: reason || null, snoozed_until: snoozedUntil },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateCustomerClassification(formData: FormData) {
  const { user } = await requirePlatformAdmin();
  const customerId = readString(formData, 'customerId');
  const customerType = validateCustomerType(readString(formData, 'customerType') || 'real');
  const doNotContact = formData.get('doNotContact') === 'on';
  const note = readString(formData, 'classificationNote');

  if (!customerId) return;
  await assertCustomerExists(customerId);

  const admin = getAdminClient();
  const { error } = await admin
    .from('user_profiles')
    .update({
      customer_type: customerType,
      do_not_contact: doNotContact,
      admin_classification_note: note || null,
    })
    .eq('id', customerId);
  if (error) throw error;

  await admin.from('admin_action_audit_logs').insert({
    admin_id: user.id,
    customer_id: customerId,
    action: 'admin_customer_classification_updated',
    metadata: { customer_type: customerType, do_not_contact: doNotContact, note: note || null },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function customerSearch(formData: FormData) {
  const q = readString(formData, 'q');
  const status = readString(formData, 'status') || 'all';
  const includeTestInternal = formData.get('include_test_internal') === 'on';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status !== 'all') params.set('status', status);
  if (includeTestInternal) params.set('include_test_internal', 'true');
  redirect(`/admin/customers${params.size ? `?${params.toString()}` : ''}`);
}
