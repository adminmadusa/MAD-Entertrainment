'use client';

import React from 'react';

import { formatMoney } from '@mad/shared';
import type { Event as EventData } from '@mad/types';

type TicketTierWithOptionalFields = EventData['ticketTiers'][number] & {
  groupName?: string;
  isFree?: boolean;
  offerRules?: {
    discountType?: 'none' | 'percentage' | 'flat';
    discountValue?: number;
    buyQty?: number;
    freeTicketQty?: number;
  };
};

interface TicketTierListProps {
  event: EventData;
  quantities: Record<string, number>;
  onQtyChange: (tier: string, change: number) => void;
  currency: string;
}

export function TicketTierList({
  event,
  quantities,
  onQtyChange,
  currency,
}: TicketTierListProps) {
  const groupedTiers = event.ticketTiers.reduce<Record<string, TicketTierWithOptionalFields[]>>(
    (acc, tier) => {
      const tierWithMeta = tier as TicketTierWithOptionalFields;
      const groupName = tierWithMeta.groupName || '';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(tierWithMeta);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary px-0.5">
        Select Tickets
      </h2>
      <div className="space-y-3">
        {Object.entries(groupedTiers).map(([groupName, tiersInGroup]) => (
          <div key={groupName || 'all'} className="space-y-2">
            {groupName && groupName.toLowerCase() !== 'passes' && (
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-accent-purple-light px-1">
                {groupName}
              </h3>
            )}
            <div className="divide-y divide-white/10">
              {tiersInGroup.map((tier) => {
                const isFree = !!tier.isFree || tier.price === 0;
                const offer = tier.offerRules;
                const discount = tier.discount || 0;
                const finalPrice = isFree ? 0 : Math.max(0, tier.price - discount);

                return (
                  <div
                    key={tier.tier}
                    className="py-4 border-b border-white/10 last:border-b-0 flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Line 1: Tier Name & Price */}
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-white capitalize">
                          {tier.name}
                        </span>
                        <span className="text-accent-purple-light font-bold text-sm">
                          {isFree ? 'FREE' : formatMoney(finalPrice, currency)}
                        </span>
                        {discount > 0 && !isFree && (
                          <span className="text-xs text-text-muted line-through">
                            {formatMoney(tier.price, currency)}
                          </span>
                        )}
                        {tier.groupSize && tier.groupSize > 1 && (
                          <span className="text-[11px] text-emerald-400 font-medium">
                            · Admits {tier.groupSize}
                          </span>
                        )}
                        {offer && offer.discountType !== 'none' && (
                          <span className="text-[11px] text-accent-pink font-medium">
                            ·{' '}
                            {offer.discountType === 'percentage'
                              ? `${offer.discountValue}% OFF`
                              : `${formatMoney(offer.discountValue, currency)} OFF`}
                          </span>
                        )}
                        {offer && offer.buyQty && offer.freeTicketQty && (
                          <span className="text-[11px] text-accent-cyan font-medium">
                            · Buy {offer.buyQty} Get {offer.freeTicketQty} Free
                          </span>
                        )}
                      </div>

                      {/* Line 2: Description & Sales End */}
                      <p className="text-xs text-text-muted leading-tight line-clamp-2">
                        {tier.description || 'General Entry Ticket'}
                        {tier.availabilityWindow?.endDate && (
                          <span className="text-accent-cyan ml-1.5">
                            · Sales end{' '}
                            {new Date(tier.availabilityWindow.endDate).toLocaleDateString('en-US', {
                              timeZone: 'UTC',
                            })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Stepper Counter */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onQtyChange(tier.tier, -1)}
                        aria-label={`Decrease ${tier.name} tickets`}
                        className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">
                        {quantities[tier.tier] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQtyChange(tier.tier, 1)}
                        aria-label={`Increase ${tier.name} tickets`}
                        className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
