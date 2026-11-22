import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateBookingPricing } from './booking-calculation.utils';

vi.mock('../../../utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../models/coupon.schema', () => ({
  Coupon: { findOne: vi.fn() },
}));

import { Coupon } from '../../../models/coupon.schema';

describe('calculateBookingPricing — offerRules & pricing engine', () => {
  const baseEvent = {
    _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b01'),
    title: 'Fest',
    countryCode: 'US',
    convenienceFee: 5,
    taxPercentage: 10,
    ticketTiers: [] as any[],
  };

  const createTier = (overrides: Partial<(typeof baseEvent.ticketTiers)[0]> = {}) => ({
    tier: 'GA',
    name: 'General',
    price: 100,
    totalCapacity: 100,
    soldCount: 0,
    taxPercent: 10,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Percentage Offer: applies when quantity >= minQty, skips when below', async () => {
    const offer = { discountType: 'percentage' as const, discountValue: 20, minQtyRequired: 2 };
    const event = { ...baseEvent, ticketTiers: [createTier({ offerRules: offer })] };

    // Threshold met: 2 * $100 = $200 gross, 20% off = $40 discount -> subtotal $160
    const met = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 2 }],
    });
    expect(met.subtotal).toBe(160);
    expect(met.finalTickets[0].subtotal).toBe(160);
    expect(met.gst).toBe(17); // $16 net tax + $1 fee tax
    expect(met.totalAmount).toBe(187);

    // Threshold not met: minQtyRequired 3
    event.ticketTiers = [createTier({ offerRules: { ...offer, minQtyRequired: 3 } })];
    const notMet = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 2 }],
    });
    expect(notMet.subtotal).toBe(200);
  });

  it('Flat Offer: applies per ticket and caps at ticket price without negatives', async () => {
    const event = {
      ...baseEvent,
      ticketTiers: [
        createTier({
          price: 50,
          offerRules: { discountType: 'flat', discountValue: 80, minQtyRequired: 1 },
        }),
      ],
    };

    const capped = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 2 }],
    });
    expect(capped.subtotal).toBe(0);
    expect(capped.finalTickets[0].subtotal).toBe(0);
    expect(capped.totalAmount).toBe(11); // $10 fee + $1 fee tax

    // Standard flat discount ($15 off $100)
    event.ticketTiers = [
      createTier({
        price: 100,
        offerRules: { discountType: 'flat', discountValue: 15, minQtyRequired: 1 },
      }),
    ];
    const std = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 2 }],
    });
    expect(std.subtotal).toBe(170); // 2 * ($100 - $15)
  });

  it('Buy X Get Y Free: calculates bundles, remainders, and enforces precedence', async () => {
    const event = {
      ...baseEvent,
      ticketTiers: [
        createTier({
          price: 100,
          offerRules: {
            discountType: 'flat', // Precedence check: buyQty/freeTicketQty overrides flat
            discountValue: 50,
            minQtyRequired: 1,
            buyQty: 2,
            freeTicketQty: 1,
          },
        }),
      ],
    };

    // 3 tickets: 1 complete bundle (2+1) -> 1 free ($100 discount), subtotal = $200
    const res3 = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 3 }],
    });
    expect(res3.subtotal).toBe(200);

    // 5 tickets: 1 bundle + 2 extra -> 1 free ($100 discount), subtotal = $400
    const res5 = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 5 }],
    });
    expect(res5.subtotal).toBe(400);

    // 6 tickets: 2 complete bundles -> 2 free ($200 discount), subtotal = $400
    const res6 = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 6 }],
    });
    expect(res6.subtotal).toBe(400);

    // 2 tickets: 0 complete bundles -> 0 free, subtotal = $200
    const res2 = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 2 }],
    });
    expect(res2.subtotal).toBe(200);
  });

  it('Tier Discount + offerRules + Coupon: cascades correctly with proportional GST', async () => {
    const event = {
      ...baseEvent,
      ticketTiers: [
        createTier({
          price: 100,
          discount: 20, // baseTierPrice = $80
          offerRules: { discountType: 'percentage', discountValue: 25, minQtyRequired: 1 },
        }),
      ],
    };

    // 2 tickets: base = $80, 25% off = $20 off -> $60/ticket -> subtotal $120
    vi.mocked(Coupon.findOne).mockResolvedValue({
      _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b88'),
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10, // 10% off $120 = $12
      validFrom: new Date(Date.now() - 10000),
      validUntil: new Date(Date.now() + 10000),
      usageLimit: 100,
      usedCount: 0,
      isActive: true,
    } as any);

    const res = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GA', quantity: 2 }],
      couponCode: 'SAVE10',
    });

    expect(res.subtotal).toBe(120);
    expect(res.discount).toBe(12);
    // netTicketSubtotal = $108, netTicketGst = 108 * (12 / 120) = 10.8 -> 11, fee = $10, feeGst = 1
    expect(res.gst).toBe(12);
    expect(res.totalAmount).toBe(108 + 10 + 12);
  });

  it('Group Tickets & Inactive Offers: handles capacity multiplier and inactive rules', async () => {
    const event = {
      ...baseEvent,
      ticketTiers: [
        createTier({
          tier: 'GRP',
          price: 300,
          groupSize: 4,
          offerRules: { discountType: 'none', discountValue: 50, minQtyRequired: 1 },
        }),
      ],
    };

    const res = await calculateBookingPricing({
      event,
      consolidatedTickets: [{ tier: 'GRP', quantity: 1 }],
    });

    expect(res.subtotal).toBe(300); // offerRules 'none' ignored
    expect(res.totalTicketsCount).toBe(4); // 1 ticket * groupSize 4
    expect(res.convenienceFee).toBe(20); // 4 * $5 fee
  });
});
