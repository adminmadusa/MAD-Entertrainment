'use client';

import React from 'react';

import type { TicketProfile, TicketGroup, TicketConfig } from '@mad/types';
import { FormField, Input } from '@mad/ui';

import { inputCls } from './constants';
import type { TicketTierInput } from './types';

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

interface EventTicketSectionProps {
  ticketingType: 'custom' | 'profile';
  setTicketingType: (val: 'custom' | 'profile') => void;
  tiers: TicketTierInput[];
  addTier: () => void;
  removeTier: (i: number) => void;
  updateTier: (i: number, field: keyof TicketTierInput, value: unknown) => void;
  dbTiers: any[];
  selectedProfileId: string;
  setSelectedProfileId: (val: string) => void;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>>>;
  dbProfiles: any[];
  activeProfile: any;
  overrides: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>;
  handleOverrideChange: (tier: string, field: 'price' | 'totalCapacity' | 'isActive', value: number | boolean | undefined) => void;
  title: string;
}

export function EventTicketSection({
  ticketingType,
  setTicketingType,
  tiers,
  addTier,
  removeTier,
  updateTier,
  dbTiers,
  selectedProfileId,
  setSelectedProfileId,
  setOverrides,
  dbProfiles,
  activeProfile,
  overrides,
  handleOverrideChange,
  title,
}: EventTicketSectionProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Ticketing Configuration</h2>
        <div className="flex bg-background rounded-lg p-0.5 border border-border-subtle">
          <button
            type="button"
            onClick={() => setTicketingType('custom')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              ticketingType === 'custom'
                ? 'bg-accent-purple text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => setTicketingType('profile')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              ticketingType === 'profile'
                ? 'bg-accent-purple text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {ticketingType === 'custom' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-white">Ticket Tiers</span>
            <button
              type="button"
              onClick={addTier}
              className="text-accent-purple text-xs font-medium hover:underline"
            >
              + Add Tier
            </button>
          </div>
          {tiers.map((tier, i) => (
            <div key={i} className="p-4 bg-white/3 rounded-xl border border-border-subtle space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm font-medium capitalize">
                  Tier {i + 1}
                </span>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
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
                    onChange={(e) => updateTier(i, 'name', e.target.value)}
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
                <FormField label="Price (₹)" htmlFor={`tier-price-${i}`}>
                  <Input
                    id={`tier-price-${i}`}
                    type="number"
                    min="0"
                    value={tier.price}
                    onChange={(e) =>
                      updateTier(i, 'price', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="0"
                    required
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Capacity" htmlFor={`tier-capacity-${i}`} required>
                  <Input
                    id={`tier-capacity-${i}`}
                    type="number"
                    min="1"
                    value={tier.capacity}
                    onChange={(e) =>
                      updateTier(i, 'capacity', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="100"
                    required
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="Select Ticket Profile" htmlFor="ticket-profile" required>
            <select
              id="ticket-profile"
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value);
                setOverrides({});
              }}
              required={ticketingType === 'profile'}
              className={inputCls}
            >
              <option value="" className="bg-background-card">
                -- Select a Profile --
              </option>
              {dbProfiles.map((p: TicketProfile) => (
                <option key={p._id} value={p._id} className="bg-background-card">
                  {p.name} ({p.groups?.length || 0} groups)
                </option>
              ))}
            </select>
          </FormField>

          {activeProfile && (
            <div className="space-y-6 pt-4 border-t border-white/5">
              <h3 className="text-white font-bold text-sm">
                Profile Preview & Event-Specific Overrides
              </h3>
              {activeProfile.groups?.map((group: TicketGroup, gIdx: number) => (
                <div
                  key={`${group.slug}-${gIdx}`}
                  className="space-y-3 p-4 bg-white/3 rounded-xl border border-white/5"
                >
                  <h4 className="text-accent-purple-light font-bold text-sm">{group.name}</h4>
                  <p className="text-text-muted text-xs">{group.description}</p>

                  <div className="space-y-3 pt-2">
                    {group.tickets?.map((ticket: TicketConfig, tIdx: number) => {
                      const override = overrides[ticket.tier] || {};
                      return (
                        <div
                          key={`${ticket.tier}-${tIdx}`}
                          className="p-3 bg-background rounded-lg border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1">
                            <span className="text-sm font-bold text-white block">
                              {ticket.name.replace(/\{eventName\}/g, title || 'Event')}
                            </span>
                            <span className="text-xs text-text-muted">
                              Tier: <strong className="text-text-secondary">{ticket.tier}</strong> &bull; Price:{' '}
                              <strong className="text-text-secondary">₹{ticket.price}</strong>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-text-muted uppercase block">
                                Capacity
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={override.totalCapacity !== undefined ? override.totalCapacity : ''}
                                placeholder={`${ticket.totalCapacity} (default)`}
                                onChange={(e) =>
                                  handleOverrideChange(
                                    ticket.tier,
                                    'totalCapacity',
                                    e.target.value === '' ? undefined : Number(e.target.value)
                                  )
                                }
                                className="w-28 text-xs py-1.5"
                              />
                            </div>
                            <div className="space-y-1 pt-4">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={override.isActive !== undefined ? override.isActive : true}
                                  onChange={(e) =>
                                    handleOverrideChange(ticket.tier, 'isActive', e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 accent-accent-purple rounded"
                                />
                                <span className="text-[11px] text-text-secondary font-medium">
                                  Visible
                                </span>
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
}
