import crypto from 'crypto';
import { Types } from 'mongoose';
import { getCountryConfig } from '@mad/shared';
import { AppError } from '../../../middleware/error.middleware';
import { Coupon } from '../../../models/coupon.schema';

export function generateSelectionFingerprint(data: {
  eventId: string;
  tickets: {
    tier: string;
    quantity: number;
    seats?: { seatId: string }[];
  }[];
  couponCode?: string;
}): string {
  const normalizedCoupon = data.couponCode ? data.couponCode.toUpperCase().trim() : '';
  const normalizedTickets = data.tickets
    .map((t) => {
      const sortedSeats = t.seats
        ? t.seats
            .map((s) => s.seatId)
            .filter(Boolean)
            .sort()
        : [];
      return {
        tier: t.tier,
        quantity: t.quantity,
        seats: sortedSeats,
      };
    })
    .sort((a, b) => a.tier.localeCompare(b.tier));

  const rawSelection = {
    eventId: data.eventId,
    tickets: normalizedTickets,
    couponCode: normalizedCoupon,
  };

  const jsonStr = JSON.stringify(rawSelection);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export async function calculateBookingPricing(params: {
  event: any;
  consolidatedTickets: Array<{
    tier: string;
    quantity: number;
    seats?: { seatId: string; section?: string }[];
  }>;
  couponCode?: string;
}) {
  const { event, consolidatedTickets, couponCode } = params;
  const eventCountry = event.countryCode || 'US';
  const countryConfig = getCountryConfig(eventCountry);

  let subtotal = 0;
  let totalTicketsCount = 0;
  let totalGst = 0;
  const finalTickets: any[] = [];

  for (const ticketReq of consolidatedTickets) {
    const tierConfig = event.ticketTiers.find(
      (t: any) => t.tier === ticketReq.tier && t.isActive
    );
    if (!tierConfig) {
      throw AppError.badRequest(`Ticket tier "${ticketReq.tier}" is invalid or inactive`);
    }

    if (tierConfig.availabilityWindow?.startDate && tierConfig.availabilityWindow?.endDate) {
      const now = new Date();
      if (
        now < new Date(tierConfig.availabilityWindow.startDate) ||
        now > new Date(tierConfig.availabilityWindow.endDate)
      ) {
        throw AppError.badRequest(
          `Ticket tier "${tierConfig.name}" is not currently available for purchase`
        );
      }
    }

    if (tierConfig.minPerBooking && ticketReq.quantity < tierConfig.minPerBooking) {
      throw AppError.badRequest(
        `Minimum ${tierConfig.minPerBooking} tickets required for tier "${tierConfig.name}"`
      );
    }

    if (tierConfig.maxPerBooking && ticketReq.quantity > tierConfig.maxPerBooking) {
      throw AppError.badRequest(
        `Maximum ${tierConfig.maxPerBooking} tickets allowed for tier "${tierConfig.name}"`
      );
    }

    const groupSize = tierConfig.groupSize || 1;
    const capacityConsumed = ticketReq.quantity * groupSize;
    if (tierConfig.soldCount + capacityConsumed > tierConfig.totalCapacity) {
      throw AppError.badRequest(
        `Requested quantity for tier "${tierConfig.name}" exceeds remaining capacity`
      );
    }

    const tierPriceAfterDiscount = Math.max(0, tierConfig.price - (tierConfig.discount || 0));
    const tierSubtotal = tierPriceAfterDiscount * ticketReq.quantity;

    const tierTaxPercent = tierConfig.taxPercent ?? event.taxPercentage ?? countryConfig.defaultTax;
    const tierGst = Math.round((tierSubtotal * tierTaxPercent) / 100);

    subtotal += tierSubtotal;
    totalGst += tierGst;
    totalTicketsCount += ticketReq.quantity * groupSize;

    finalTickets.push({
      tier: ticketReq.tier,
      tierName: tierConfig.name,
      quantity: ticketReq.quantity,
      pricePerTicket: tierConfig.price,
      subtotal: tierSubtotal,
      seats: ticketReq.seats || [],
    });
  }

  if (totalTicketsCount <= 0) {
    throw AppError.badRequest('Must book at least 1 ticket');
  }

  const baseFee =
    event.convenienceFee !== undefined
      ? event.convenienceFee
      : countryConfig.defaultConvenienceFee;
  const convenienceFee = baseFee * totalTicketsCount;
  const taxPercentage =
    event.taxPercentage !== undefined ? event.taxPercentage : countryConfig.defaultTax;
  const convenienceFeeGst = Math.round((convenienceFee * taxPercentage) / 100);

  let discount = 0;
  let couponId: Types.ObjectId | undefined;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.isActive) {
      throw AppError.badRequest('Coupon is invalid or inactive');
    }

    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
      throw AppError.badRequest('Coupon validity has expired');
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw AppError.badRequest('Coupon usage limit reached');
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw AppError.badRequest(
        `Minimum subtotal order amount of ${countryConfig.symbol}${coupon.minOrderAmount} is required for this coupon`
      );
    }

    if (coupon.applicableEventIds && coupon.applicableEventIds.length > 0) {
      const hasEvent = coupon.applicableEventIds.some(
        (id: any) => id.toString() === event._id.toString()
      );
      if (!hasEvent) {
        throw AppError.badRequest('Coupon is not applicable to this event');
      }
    }

    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      if (!coupon.applicableCategories.includes(event.category)) {
        throw AppError.badRequest('Coupon is not applicable to this category of events');
      }
    }

    if (coupon.discountType === 'percentage') {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    couponId = coupon._id as Types.ObjectId;
  }

  const netTicketSubtotal = Math.max(0, subtotal - discount);
  const netTicketGst =
    subtotal > 0 ? Math.round(netTicketSubtotal * (totalGst / subtotal)) : 0;
  const gst = netTicketGst + convenienceFeeGst;
  const totalAmount = Math.max(0, netTicketSubtotal + convenienceFee + gst);

  return {
    finalTickets,
    subtotal,
    convenienceFee,
    gst,
    discount,
    totalAmount,
    totalTicketsCount,
    couponId,
    countryConfig,
  };
}
