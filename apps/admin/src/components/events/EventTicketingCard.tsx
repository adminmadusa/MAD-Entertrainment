import React from 'react';

import { type AdminTier } from '@/lib/api/admin/tier.service';
import type { TicketProfile } from '@mad/types';
import { FormField } from '@mad/ui';


const TICKET_TIER_NAMES = [
  'general',
  'silver',
  'gold',
  'platinum',
  'vip',
  'vvip',
  'backstage',
  'couple',
  'group',
  'family',
  'early_bird',
  'custom',
];

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';


export interface TicketTierInput {
  name: string;
  price: number | '';
  capacity: number | '';
}

export interface EventTicketingCardProps {
  ticketingType: 'custom' | 'profile';
  setTicketingType: (val: 'custom' | 'profile') => void;
  tiers: TicketTierInput[];
  onAddTier: () => void;
  onRemoveTier: (idx: number) => void;
  onUpdateTier: (idx: number, field: keyof TicketTierInput, value: unknown) => void;
  selectedProfileId: string;
  setSelectedProfileId: (val: string) => void;
  overrides: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>;
  onOverrideChange: (
    tier: string,
    field: 'price' | 'totalCapacity' | 'isActive',
    value: number | boolean | undefined
  ) => void;
  dbTiers: AdminTier[];
  dbProfiles: TicketProfile[];
  activeProfile: TicketProfile | undefined;
  eventTitle: string;
}

export const EventTicketingCard = React.memo(function EventTicketingCard({
  ticketingType,
  setTicketingType,
  tiers,
  onAddTier,
  onRemoveTier,
  onUpdateTier,
  selectedProfileId,
  setSelectedProfileId,
  overrides,
  onOverrideChange,
  dbTiers,
  dbProfiles,
  activeProfile,
  eventTitle,
}: EventTicketingCardProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h2 className="text-white font-semibold text-base">Ticketing Configuration</h2>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setTicketingType('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              ticketingType === 'custom'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Custom Tiers
          </button>
          <button
            type="button"
            onClick={() => setTicketingType('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              ticketingType === 'profile'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Ticket Profile
          </button>
        </div>
      </div>

      {ticketingType === 'custom' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm font-medium">Define custom ticket tiers for this event</span>
            <button
              type="button"
              onClick={onAddTier}
              className="text-accent-purple text-sm font-medium hover:text-accent-purple-light transition-colors"
            >
              + Add Tier
            </button>
          </div>
          {tiers.map((tier, i) => (
            <div key={i} className="p-4 bg-white/3 rounded-xl border border-border-subtle space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm font-medium capitalize">Tier {i + 1}</span>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveTier(i)}
                    className="text-error text-xs hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tier Name" htmlFor={`tier-name-${i}`}>
                  <select
                    id={`tier-name-${i}`}
                    value={tier.name}
                    onChange={(e) => onUpdateTier(i, 'name', e.target.value)}
                    className={inputCls}
                  >
                    {dbTiers.length > 0
                      ? dbTiers.map((t) => (
                          <option key={t._id} value={t.slug} className="bg-background-card capitalize">
                            {t.name}
                          </option>
                        ))
                      : TICKET_TIER_NAMES.map((n) => (
                          <option key={n} value={n} className="bg-background-card capitalize">
                            {n}
                          </option>
                        ))}
                  </select>
                </FormField>
                <FormField label="Price per Ticket (₹)" htmlFor={`tier-price-${i}`}>
                  <input
                    id={`tier-price-${i}`}
                    type="number"
                    min="0"
                    value={tier.price}
                    onChange={(e) =>
                      onUpdateTier(i, 'price', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="0"
                    required
                    className={inputCls}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Ticket Capacity Limit *" htmlFor={`tier-capacity-${i}`}>
                  <input
                    id={`tier-capacity-${i}`}
                    type="number"
                    min="1"
                    value={tier.capacity}
                    onChange={(e) =>
                      onUpdateTier(i, 'capacity', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="100"
                    required
                    className={inputCls}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="Select Ticket Profile *" htmlFor="profile-select">
            <select
              id="profile-select"
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value);
              }}
              required={ticketingType === 'profile'}
              className={inputCls}
            >
              <option value="" className="bg-background-card">-- Select a Profile --</option>
              {dbProfiles.map((p) => (
                <option key={p._id} value={p._id} className="bg-background-card">
                  {p.name} ({p.groups?.length || 0} groups)
                </option>
              ))}
            </select>
          </FormField>

          {activeProfile && (
            <div className="space-y-6 pt-4 border-t border-white/5">
              <h3 className="text-white font-bold text-sm">Profile Preview & Event-Specific Overrides</h3>
              {activeProfile.groups?.map((group, gIdx) => (
                <div key={`${group.slug}-${gIdx}`} className="space-y-3 p-4 bg-white/3 rounded-xl border border-white/5">
                  <h4 className="text-accent-purple-light font-bold text-sm">{group.name}</h4>
                  <p className="text-text-muted text-xs">{group.description}</p>

                  <div className="space-y-3 pt-2">
                    {group.tickets?.map((ticket, tIdx) => {
                      const override = overrides[ticket.tier] || {};
                      return (
                        <div
                          key={`${ticket.tier}-${tIdx}`}
                          className="p-3 bg-background rounded-lg border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1">
                            <span className="text-sm font-bold text-white block">
                              {ticket.name.replace(/\{eventName\}/g, eventTitle || 'Event')}
                            </span>
                            <span className="text-xs text-text-muted">
                              Tier: <strong className="text-text-secondary">{ticket.tier}</strong> &bull; Price:{' '}
                              <strong className="text-text-secondary">₹{ticket.price}</strong>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-text-muted uppercase block">Capacity</label>
                              <input
                                type="number"
                                min={1}
                                value={override.totalCapacity !== undefined ? override.totalCapacity : ''}
                                placeholder={`${ticket.totalCapacity} (default)`}
                                onChange={(e) =>
                                  onOverrideChange(
                                    ticket.tier,
                                    'totalCapacity',
                                    e.target.value === '' ? undefined : Number(e.target.value)
                                  )
                                }
                                className="w-28 px-3 py-1.5 rounded-lg bg-background-card border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                              />
                            </div>
                            <div className="space-y-1 pt-4">
                              <label htmlFor={`override-visible-${ticket.tier}`} className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  id={`override-visible-${ticket.tier}`}
                                  type="checkbox"
                                  checked={override.isActive !== undefined ? override.isActive : true}
                                  onChange={(e) =>
                                    onOverrideChange(ticket.tier, 'isActive', e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 accent-accent-purple rounded"
                                />
                                <span className="text-[11px] text-text-secondary font-medium">Visible</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
