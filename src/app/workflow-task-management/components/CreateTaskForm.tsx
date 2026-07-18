'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface CreateTaskFormData {
  title: string; type: string; clientId: string;
  priority: string; dueDate: string; assignee: string;
  bureau: string; notes: string;
}

const taskTypes = [
  'Client Onboarding', 'Case Setup', 'Letter Generation',
  'Dispute Follow-Up', 'Bureau Response Review', 'Billing Follow-Up',
  'Escalation', 'Case Review', 'Case Closure',
];

export default function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTaskFormData>({
    defaultValues: { priority: 'Medium', assignee: 'Keisha James', bureau: '' },
  });

  const onSubmit = (data: CreateTaskFormData) => {
    setLoading(true);
    // Backend: POST /api/tasks with task data
    setTimeout(() => {
      setLoading(false);
      toast.success(`Task "${data.title}" created and assigned to ${data.assignee}`);
      onClose();
    }, 900);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label-text">Task title</label>
        <input type="text" className="input-field" placeholder="e.g. Review Equifax response for client" {...register('title', { required: 'Task title is required' })} />
        {errors.title && <p className="error-text">{errors.title.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Task type</label>
          <select className="input-field" {...register('type', { required: true })}>
            {taskTypes.map(t => <option key={`type-opt-${t}`} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label-text">Client</label>
          <select className="input-field" {...register('clientId', { required: 'Select a client' })}>
            <option value="">— Select client —</option>
            {['Darnell Washington', 'Priya Nambiar', 'Marcus Holloway', 'Tanisha Brooks', 'Roberto Fuentes', 'Adriana Morales', 'Devon Clarke'].map(n => (
              <option key={`ct-${n}`} value={n}>{n}</option>
            ))}
          </select>
          {errors.clientId && <p className="error-text">{errors.clientId.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label-text">Priority</label>
          <select className="input-field" {...register('priority')}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <div>
          <label className="label-text">Due date</label>
          <input type="date" className="input-field" {...register('dueDate', { required: 'Due date required' })} />
          {errors.dueDate && <p className="error-text">{errors.dueDate.message}</p>}
        </div>
        <div>
          <label className="label-text">Assign to</label>
          <select className="input-field" {...register('assignee')}>
            <option>Keisha James</option>
            <option>Marcus Reed</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label-text">Bureau (optional)</label>
        <p className="helper-text">If this task relates to a specific bureau dispute</p>
        <select className="input-field" {...register('bureau')}>
          <option value="">— Not bureau-specific —</option>
          <option value="EQ">Equifax</option>
          <option value="EX">Experian</option>
          <option value="TU">TransUnion</option>
        </select>
      </div>
      <div>
        <label className="label-text">Notes (optional)</label>
        <textarea className="input-field resize-none" rows={3} placeholder="Additional context for this task..." {...register('notes')} />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 min-w-[120px] justify-center">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Task'}
        </button>
      </div>
    </form>
  );
}