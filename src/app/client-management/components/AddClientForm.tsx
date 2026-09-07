'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AddClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  plan: string;
  assignedStaff: string;
  notes: string;
  bureausEQ: boolean;
  bureausEX: boolean;
  bureausTU: boolean;
}

export default function AddClientForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<AddClientFormData>({
    defaultValues: {
      plan: 'Growth',
      assignedStaff: '',
      bureausEQ: true,
      bureausEX: true,
      bureausTU: true,
    },
  });

  const onSubmit = async (data: AddClientFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const bureaus: string[] = [];
      if (data.bureausEQ) bureaus.push('EQ');
      if (data.bureausEX) bureaus.push('EX');
      if (data.bureausTU) bureaus.push('TU');

      const clientResponse = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, bureaus }),
      });
      const createdClient = await clientResponse.json().catch(() => null);
      if (!clientResponse.ok || !createdClient?.id) throw new Error(createdClient?.error || 'Failed to enroll client');

      toast.success(`${data.firstName} ${data.lastName} enrolled successfully`);

      // Create an opaque, tenant-bound portal invitation. Email is only the
      // delivery address; accepting the token binds the immutable Auth UUID.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (createdClient?.id && accessToken) {
        const invitationResponse = await fetch('/api/workspaces/client-invitations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            clientId: createdClient.id,
            email: data.email,
            clientName: `${data.firstName} ${data.lastName}`,
            assignedStaff: data.assignedStaff,
            clientPlan: data.plan,
          }),
        });
        const invitationResult = await invitationResponse.json().catch(() => null);
        if (!invitationResponse.ok || !invitationResult?.emailSent) {
          toast.warning('Client saved, but the portal invitation email needs to be resent.');
        }
      } else {
        toast.warning('Client saved, but the portal invitation email needs to be resent.');
      }

      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">First name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Darnell"
            {...register('firstName', { required: 'Required' })}
          />
          {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="label-text">Last name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Washington"
            {...register('lastName', { required: 'Required' })}
          />
          {errors.lastName && <p className="error-text">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="label-text">Email address</label>
        <input
          type="email"
          className="input-field"
          placeholder="client@email.com"
          {...register('email', { required: 'Required' })}
        />
        {errors.email && <p className="error-text">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="label-text">Phone number</label>
        <input
          type="tel"
          className="input-field"
          placeholder="Client phone number"
          {...register('phone', { required: 'Required' })}
        />
        {errors.phone && <p className="error-text">{errors.phone.message}</p>}
      </div>

      {/* Plan + Staff */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Subscription plan</label>
          <select className="input-field" {...register('plan')}>
            <option>Starter</option>
            <option>Growth</option>
            <option>Agency</option>
          </select>
        </div>
        <div>
          <label className="label-text">Assigned staff</label>
          <input className="input-field" placeholder="Staff member (optional)" {...register('assignedStaff')} />
        </div>
      </div>

      {/* Bureaus */}
      <div>
        <label className="label-text">Credit bureaus to dispute</label>
        <p className="helper-text">Select all bureaus for this client's dispute strategy</p>
        <div className="flex gap-4 mt-2">
          {[
            { key: 'bureausEQ', label: 'Equifax' },
            { key: 'bureausEX', label: 'Experian' },
            { key: 'bureausTU', label: 'TransUnion' },
          ].map((b) => (
            <label key={`bureau-check-${b.key}`} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-input accent-primary"
                {...register(b.key as keyof AddClientFormData)}
              />
              <span className="text-sm font-medium text-foreground">{b.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label-text">Case notes (optional)</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Initial consultation notes, credit issues, goals..."
          {...register('notes')}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2 min-w-[130px] justify-center"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            'Enroll Client'
          )}
        </button>
      </div>
    </form>
  );
}
