import React, { useState } from 'react';

import { type AdminTier } from '@/lib/api/admin/tier.service';
import { TicketTier } from '@mad/shared';

import { OfferRulesSection } from './OfferRulesSection';
import { type TicketInput, inputCls } from './utils';

export interface TicketTierCardProps {
  ticket: TicketInput;
  gIdx: number;
  tIdx: number;
  canRemove: boolean;
  onRemove: (gIdx: number, tIdx: number) => void;
  onUpdateField: (gIdx: number, tIdx: number, field: keyof TicketInput, value: unknown) => void;
  dbTiers: AdminTier[];
  allSelectedTiers: string[];
}

export const TicketTierCard = React.memo(function TicketTierCard({
  ticket,
  gIdx,
  tIdx,
  canRemove,
  onRemove,
  onUpdateField,
  dbTiers,
  allSelectedTiers,
}: TicketTierCardProps) {
  const [isExpanded, setIsExpanded] = useState(tIdx === 0);

  // Collapsed View
  if (!isExpanded) {
    return (
      <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/5 flex items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">
            Tier {tIdx + 1}:
          </span>
          <span className="text-white font-extrabold text-sm">
            {ticket.name || <span className="text-text-muted/40 italic">Unnamed Tier</span>}
          </span>
          <span className="text-accent-purple-light text-xs font-semibold">
            ({ticket.isFree ? 'Free' : ticket.price !== '' ? `₹${ticket.price}` : '₹0'})
          </span>
        </div>

        <div className="flex items-center gap-4">
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(gIdx, tIdx)}
              className="text-red-400/80 hover:text-red-400 text-xs font-medium transition-colors"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-accent-purple text-xs font-bold hover:underline flex items-center gap-1"
          >
            Expand Details ▼
          </button>
        </div>
      </div>
    );
  }

  // Expanded View
  return (
    <div className="p-5 bg-white/[0.02] rounded-xl border border-white/5 space-y-5 relative transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">
          Tier {tIdx + 1} Configuration
        </span>
        <div className="flex items-center gap-4">
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(gIdx, tIdx)}
              className="text-red-400/80 hover:text-red-400 text-xs font-medium transition-colors"
            >
              Remove Tier
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-accent-purple text-xs font-bold hover:underline"
          >
            Collapse ▲
          </button>
        </div>
      </div>

      {/* Row 1: System Enum & Display Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`ticket-tier-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">System Tier Enum</label>
          <select
            id={`ticket-tier-${gIdx}-${tIdx}`}
            value={ticket.tier}
            onChange={(e) => onUpdateField(gIdx, tIdx, 'tier', e.target.value)}
            className={inputCls}
          >
            {dbTiers.length > 0
              ? dbTiers
                  .filter((t) => t.slug === ticket.tier || !allSelectedTiers.includes(t.slug))
                  .map((t) => (
                    <option key={t._id} value={t.slug} className="bg-background-card">
                      {t.name}
                    </option>
                  ))
              : Object.values(TicketTier)
                  .filter((tierVal) => tierVal === ticket.tier || !allSelectedTiers.includes(tierVal))
                  .map((tierVal) => (
                    <option key={tierVal} value={tierVal} className="bg-background-card">
                      {tierVal}
                    </option>
                  ))}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor={`ticket-name-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">
            Display Name (use {"{eventName}"} for auto-mapping) *
          </label>
          <input
            id={`ticket-name-${gIdx}-${tIdx}`}
            value={ticket.name}
            onChange={(e) => onUpdateField(gIdx, tIdx, 'name', e.target.value)}
            placeholder="e.g. {eventName} VIP Pass"
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 2: Pricing, Capacity, Free Ticket option */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <label htmlFor={`ticket-price-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Price (₹)</label>
          <input
            id={`ticket-price-${gIdx}-${tIdx}`}
            type="number"
            min={0}
            value={ticket.price}
            disabled={ticket.isFree}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              onUpdateField(gIdx, tIdx, 'price', val);
              if (val === 0) {
                onUpdateField(gIdx, tIdx, 'isFree', true);
              } else if (typeof val === 'number' && val > 0) {
                onUpdateField(gIdx, tIdx, 'isFree', false);
              }
            }}
            placeholder="e.g. 1500"
            required={!ticket.isFree}
            className={`${inputCls} disabled:opacity-50`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`ticket-capacity-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Capacity Limit</label>
          <input
            id={`ticket-capacity-${gIdx}-${tIdx}`}
            type="number"
            min={1}
            value={ticket.totalCapacity}
            onChange={(e) =>
              onUpdateField(
                gIdx,
                tIdx,
                'totalCapacity',
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            placeholder="e.g. 100"
            required
            className={inputCls}
          />
        </div>
        <div className="pb-3.5 flex items-center">
          <label htmlFor={`ticket-isfree-${gIdx}-${tIdx}`} className="flex items-center gap-3 cursor-pointer select-none">
            <input
              id={`ticket-isfree-${gIdx}-${tIdx}`}
              type="checkbox"
              checked={ticket.isFree}
              onChange={(e) => {
                onUpdateField(gIdx, tIdx, 'isFree', e.target.checked);
                if (e.target.checked) {
                  onUpdateField(gIdx, tIdx, 'price', 0);
                }
              }}
              className="w-4.5 h-4.5 accent-accent-purple rounded bg-background border-border-subtle"
            />
            <span className="text-text-secondary text-xs font-semibold">
              Mark as FREE Ticket
            </span>
          </label>
        </div>
      </div>

      {/* Row 3: Limits (Min & Max) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`ticket-min-qty-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Min Qty / Booking</label>
          <input
            id={`ticket-min-qty-${gIdx}-${tIdx}`}
            type="number"
            min={1}
            value={ticket.minPerBooking}
            onChange={(e) =>
              onUpdateField(
                gIdx,
                tIdx,
                'minPerBooking',
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            placeholder="e.g. 1"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`ticket-max-qty-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Max Qty / Booking</label>
          <input
            id={`ticket-max-qty-${gIdx}-${tIdx}`}
            type="number"
            min={1}
            value={ticket.maxPerBooking}
            onChange={(e) =>
              onUpdateField(
                gIdx,
                tIdx,
                'maxPerBooking',
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            placeholder="e.g. 10"
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 4: Description */}
      <div className="space-y-1.5">
        <label htmlFor={`ticket-desc-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Tier Description</label>
        <input
          id={`ticket-desc-${gIdx}-${tIdx}`}
          value={ticket.description}
          onChange={(e) => onUpdateField(gIdx, tIdx, 'description', e.target.value)}
          placeholder="Brief description of perks..."
          className={inputCls}
        />
      </div>

      {/* Offer Rules Section */}
      <OfferRulesSection
        ticket={ticket}
        gIdx={gIdx}
        tIdx={tIdx}
        onUpdateField={onUpdateField}
      />
    </div>
  );
});
