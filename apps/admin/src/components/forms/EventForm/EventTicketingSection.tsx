import { TicketProfile } from '@mad/types';

import { FormField } from '@/components/forms/primitives/FormField';
import { FormSection } from '@/components/forms/primitives/FormSection';
import { EVENT_FORM_FALLBACK_TIER_NAMES } from '@/components/forms/constants/event-form.constants';
import { AdminTier } from '@/lib/api/admin/tier.service';
import { EventFormValues } from '@/types/event-form';

export function EventTicketingSection({
  values,
  tiers,
  profiles,
  onFieldChange,
  addTier,
  removeTier,
  updateTier,
  setOverride,
  resetOverridesForProfile,
  inputCls,
}: {
  values: EventFormValues;
  tiers: AdminTier[];
  profiles: TicketProfile[];
  onFieldChange: <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => void;
  addTier: () => void;
  removeTier: (index: number) => void;
  updateTier: (index: number, field: 'name' | 'price' | 'capacity' | 'groupSize' | 'minPerBooking' | 'discount' | 'taxPercent' | 'startDate' | 'endDate' | 'description' | 'isAvailable', value: unknown) => void;
  setOverride: (tier: string, field: 'totalCapacity' | 'isActive', value: number | boolean | undefined) => void;
  resetOverridesForProfile: (profileId: string) => void;
  inputCls: string;
}) {
  const activeProfile = profiles.find((profile) => profile._id === values.selectedProfileId);

  return (
    <FormSection title="Ticketing Configuration">
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
        <button type="button" onClick={() => onFieldChange('ticketingType', 'custom')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${values.ticketingType === 'custom' ? 'bg-accent-purple text-white' : 'text-text-secondary'}`}>Custom Tiers</button>
        <button type="button" onClick={() => onFieldChange('ticketingType', 'profile')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${values.ticketingType === 'profile' ? 'bg-accent-purple text-white' : 'text-text-secondary'}`}>Ticket Profile</button>
      </div>

      {values.ticketingType === 'custom' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm font-medium">Define custom ticket tiers for this event</span>
            <button type="button" onClick={addTier} className="text-accent-purple text-sm font-medium">+ Add Tier</button>
          </div>
          {values.tiers.map((tier, i) => (
            <div key={i} className="p-4 bg-white/3 rounded-xl border border-border-subtle space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tier Name">
                      <select value={tier.name} onChange={(e) => updateTier(i, 'name', e.target.value)} className={inputCls}>
                        {tiers.length > 0
                          ? tiers.map((item) => <option key={item._id} value={item.slug} className="bg-background-card capitalize">{item.name}</option>)
                      : EVENT_FORM_FALLBACK_TIER_NAMES.map((name) => <option key={name} value={name} className="bg-background-card capitalize">{name}</option>)}
                  </select>
                </FormField>
                <FormField label="Price (₹)"><input type="number" min="0" value={tier.price} onChange={(e) => updateTier(i, 'price', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></FormField>
                <FormField label="Capacity *"><input type="number" min="1" value={tier.capacity} onChange={(e) => updateTier(i, 'capacity', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></FormField>
              </div>
              {values.tiers.length > 1 && <button type="button" onClick={() => removeTier(i)} className="text-error text-xs hover:underline">Remove</button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="Select Ticket Profile *">
            <select value={values.selectedProfileId} onChange={(e) => resetOverridesForProfile(e.target.value)} className={inputCls}>
              <option value="" className="bg-background-card">-- Select a Profile --</option>
              {profiles.map((profile) => <option key={profile._id} value={profile._id} className="bg-background-card">{profile.name}</option>)}
            </select>
          </FormField>
          {activeProfile?.groups?.map((group, gIdx) => (
            <div key={`${group.slug}-${gIdx}`} className="space-y-3 p-4 bg-white/3 rounded-xl border border-white/5">
              <h4 className="text-accent-purple-light font-bold text-sm">{group.name}</h4>
              {group.tickets?.map((ticket, tIdx) => {
                const override = values.overrides[ticket.tier] || {};
                return (
                  <div key={`${ticket.tier}-${tIdx}`} className="p-3 bg-background rounded-lg border border-border-subtle flex flex-wrap items-center gap-3">
                    <span className="text-xs text-text-secondary">{ticket.name}</span>
                    <input type="number" min={1} value={override.totalCapacity ?? ''} placeholder={`${ticket.totalCapacity}`} onChange={(e) => setOverride(ticket.tier, 'totalCapacity', e.target.value === '' ? undefined : Number(e.target.value))} className="w-24 px-2 py-1 rounded bg-background-card border border-border-subtle text-xs" />
                    <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={override.isActive ?? true} onChange={(e) => setOverride(ticket.tier, 'isActive', e.target.checked)} />Visible</label>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
