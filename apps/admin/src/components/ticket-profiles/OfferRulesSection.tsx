import React from 'react';

import { type TicketInput, miniInputCls } from './utils';

export interface OfferRulesSectionProps {
  ticket: TicketInput;
  gIdx: number;
  tIdx: number;
  onUpdateField: (gIdx: number, tIdx: number, field: keyof TicketInput, value: unknown) => void;
}

export const OfferRulesSection = React.memo(function OfferRulesSection({
  ticket,
  gIdx,
  tIdx,
  onUpdateField,
}: OfferRulesSectionProps) {
  return (
    <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-4">
      <h4 className="text-text-secondary font-bold text-xs uppercase tracking-wider">
        Offers & Group Pricing Rules
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-text-muted text-xs">Discount Type</label>
          <select
            value={ticket.discountType}
            onChange={(e) => onUpdateField(gIdx, tIdx, 'discountType', e.target.value)}
            className={miniInputCls}
          >
            <option value="none" className="bg-background-card">No Offer</option>
            <option value="percentage" className="bg-background-card">Percentage Discount</option>
            <option value="flat" className="bg-background-card">Flat Amount Discount</option>
          </select>
        </div>
        {ticket.discountType !== 'none' && (
          <>
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs">
                {ticket.discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Value ($)'}
              </label>
              <input
                type="number"
                min={0}
                value={ticket.discountValue}
                onChange={(e) =>
                  onUpdateField(
                    gIdx,
                    tIdx,
                    'discountValue',
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                placeholder="e.g. 10"
                className={miniInputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs">Min Quantity Required</label>
              <input
                type="number"
                min={1}
                value={ticket.minQtyRequired}
                onChange={(e) =>
                  onUpdateField(
                    gIdx,
                    tIdx,
                    'minQtyRequired',
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                placeholder="e.g. 4"
                className={miniInputCls}
              />
            </div>
          </>
        )}
      </div>

      {ticket.discountType !== 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
          <div className="space-y-1.5">
            <label className="text-text-muted text-xs">Buy Quantity (for Buy X Get Y Free)</label>
            <input
              type="number"
              min={1}
              value={ticket.buyQty}
              onChange={(e) =>
                onUpdateField(
                  gIdx,
                  tIdx,
                  'buyQty',
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              placeholder="e.g. 4"
              className={miniInputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-text-muted text-xs">Free Quantity (for Buy X Get Y Free)</label>
            <input
              type="number"
              min={1}
              value={ticket.freeTicketQty}
              onChange={(e) =>
                onUpdateField(
                  gIdx,
                  tIdx,
                  'freeTicketQty',
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              placeholder="e.g. 1"
              className={miniInputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
});
