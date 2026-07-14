import React from 'react';

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
}

export const TicketTierCard = React.memo(function TicketTierCard({
  ticket,
  gIdx,
  tIdx,
  canRemove,
  onRemove,
  onUpdateField,
  dbTiers,
}: TicketTierCardProps) {
  return (
    <div className="p-5 bg-white/3 rounded-xl border border-white/5 space-y-4 relative">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-xs font-bold uppercase">
          Tier {tIdx + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(gIdx, tIdx)}
            className="text-red-400 text-xs hover:underline"
          >
            Remove Tier
          </button>
        )}
      </div>

      {/* Ticket Config Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`ticket-tier-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">System Tier Enum</label>
          <select
            id={`ticket-tier-${gIdx}-${tIdx}`}
            value={ticket.tier}
            onChange={(e) => onUpdateField(gIdx, tIdx, 'tier', e.target.value)}
            className={inputCls}
          >
            {dbTiers.length > 0
              ? dbTiers.map((t) => (
                  <option key={t._id} value={t.slug} className="bg-background-card">
                    {t.name}
                  </option>
                ))
              : Object.values(TicketTier).map((tierVal) => (
                  <option key={tierVal} value={tierVal} className="bg-background-card">
                    {tierVal}
                  </option>
                ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
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

      {/* Ticket Config Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`ticket-price-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Price (₹)</label>
          <input
            id={`ticket-price-${gIdx}-${tIdx}`}
            type="number"
            min={0}
            value={ticket.price}
            disabled={ticket.isFree}
            onChange={(e) =>
              onUpdateField(
                gIdx,
                tIdx,
                'price',
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
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
      </div>

      {/* Ticket Config Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5 flex items-end pb-3">
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
              className="w-4 h-4 accent-accent-purple rounded"
            />
            <span className="text-text-secondary text-xs font-medium">
              Mark as FREE Ticket
            </span>
          </label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`ticket-desc-${gIdx}-${tIdx}`} className="text-text-secondary text-xs font-medium">Tier Description</label>
          <input
            id={`ticket-desc-${gIdx}-${tIdx}`}
            value={ticket.description}
            onChange={(e) => onUpdateField(gIdx, tIdx, 'description', e.target.value)}
            placeholder="Brief description of perks..."
            className={inputCls}
          />
        </div>
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
