'use client';

import { TicketTier } from '@mad/shared';

import { FormActions } from '@/components/forms/primitives';
import { EVENT_FORM_INPUT_CLASS } from '@/components/forms/constants/event-form.constants';
import { useTicketProfileForm } from '@/hooks/forms/use-ticket-profile-form';
import { AdminTier } from '@/lib/api/admin/tier.service';
import { TicketProfile } from '@mad/types';
import { TicketProfileFormMode } from '@/types/ticket-profile-form';

interface TicketProfileFormProps {
  mode: TicketProfileFormMode;
  initialProfile?: TicketProfile;
  tiers: AdminTier[];
  isSubmitting: boolean;
  serverError: string;
  onBack: () => void;
  onSubmitPayload: Parameters<typeof useTicketProfileForm>[0]['onSubmitPayload'];
}

export function TicketProfileForm({
  mode,
  initialProfile,
  tiers,
  isSubmitting,
  serverError,
  onBack,
  onSubmitPayload,
}: TicketProfileFormProps) {
  const {
    values,
    error,
    setField,
    addGroup,
    removeGroup,
    updateGroupField,
    addTicket,
    removeTicket,
    updateTicketField,
    submit,
  } = useTicketProfileForm({ mode, initialProfile, onSubmitPayload });

  let submitLabel = mode === 'create' ? 'Create Ticket Profile' : 'Save Changes';
  if (isSubmitting) submitLabel = mode === 'create' ? 'Creating...' : 'Saving...';

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{mode === 'create' ? 'Create Ticket Profile' : 'Edit Ticket Profile'}</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === 'create' ? 'Define reusable event ticket templates' : 'Modify centralized event ticket template'}
          </p>
        </div>
        <button onClick={onBack} className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5">← Back</button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submit();
        }}
        className="space-y-6"
      >
        {(serverError || error) && (
          <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
            {serverError || error}
          </div>
        )}

        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
          <h2 className="text-white font-semibold text-base">Profile Info</h2>
          <div className="space-y-1.5">
            <label className="text-text-secondary text-sm font-medium">Profile Name *</label>
            <input value={values.name} onChange={(e) => setField('name', e.target.value)} required className={EVENT_FORM_INPUT_CLASS} />
          </div>
          <div className="space-y-1.5">
            <label className="text-text-secondary text-sm font-medium">Description</label>
            <textarea value={values.description} onChange={(e) => setField('description', e.target.value)} rows={3} className={`${EVENT_FORM_INPUT_CLASS} resize-none`} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">Ticket Groups / Sections</h2>
            <button type="button" onClick={addGroup} className="px-3.5 py-2 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light text-xs font-semibold hover:bg-accent-purple/20 transition-all">+ Add Group</button>
          </div>

          {values.groups.map((group, groupIndex) => (
            <div key={groupIndex} className="glass rounded-2xl border border-border-subtle p-6 space-y-6 relative">
              {values.groups.length > 1 && (
                <button type="button" onClick={() => removeGroup(groupIndex)} className="absolute top-6 right-6 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Remove Group</button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-sm font-medium">Group Name *</label>
                  <input value={group.name} onChange={(e) => updateGroupField(groupIndex, 'name', e.target.value)} className={EVENT_FORM_INPUT_CLASS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-sm font-medium">Slug</label>
                  <input value={group.slug} onChange={(e) => updateGroupField(groupIndex, 'slug', e.target.value)} className={EVENT_FORM_INPUT_CLASS} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-text-secondary text-sm font-medium">Description</label>
                <textarea value={group.description} onChange={(e) => updateGroupField(groupIndex, 'description', e.target.value)} rows={2} className={`${EVENT_FORM_INPUT_CLASS} resize-none`} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">Tickets</h3>
                  <button type="button" onClick={() => addTicket(groupIndex)} className="text-xs font-semibold text-accent-purple hover:text-accent-purple-light transition-colors">+ Add Ticket</button>
                </div>

                {group.tickets.map((ticket, ticketIndex) => (
                  <div key={ticketIndex} className="p-4 bg-white/3 rounded-xl border border-border-subtle space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-text-secondary text-sm font-medium">Tier</label>
                        <select value={ticket.tier} onChange={(e) => updateTicketField(groupIndex, ticketIndex, 'tier', e.target.value as TicketTier)} className={EVENT_FORM_INPUT_CLASS}>
                          {tiers.map((tier) => (
                            <option key={tier._id} value={tier.slug} className="bg-background-card">{tier.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-text-secondary text-sm font-medium">Ticket Name *</label>
                        <input value={ticket.name} onChange={(e) => updateTicketField(groupIndex, ticketIndex, 'name', e.target.value)} className={EVENT_FORM_INPUT_CLASS} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-text-secondary text-sm font-medium">Price (₹)</label>
                        <input type="number" min="0" value={ticket.price} onChange={(e) => updateTicketField(groupIndex, ticketIndex, 'price', e.target.value === '' ? '' : Number(e.target.value))} className={EVENT_FORM_INPUT_CLASS} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-text-secondary text-sm font-medium">Capacity</label>
                        <input type="number" min="1" value={ticket.totalCapacity} onChange={(e) => updateTicketField(groupIndex, ticketIndex, 'totalCapacity', e.target.value === '' ? '' : Number(e.target.value))} className={EVENT_FORM_INPUT_CLASS} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-text-secondary flex items-center gap-2">
                        <input type="checkbox" checked={ticket.isActive} onChange={(e) => updateTicketField(groupIndex, ticketIndex, 'isActive', e.target.checked)} />
                        Active
                      </label>
                      {group.tickets.length > 1 && (
                        <button type="button" onClick={() => removeTicket(groupIndex, ticketIndex)} className="text-xs font-bold text-red-400 hover:text-red-300">Remove Ticket</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <FormActions onCancel={onBack} isSubmitting={isSubmitting} submitLabel={submitLabel} />
      </form>
    </div>
  );
}
