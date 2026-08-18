# ADR-002: Coupon Pricing Calculation and Redemption Ownership Invariants

- **Status**: Implemented
- **Owner**: Financial Domain Tech Lead / Repository Architecture
- **Date**: 2026-08-18
- **Applies To**: `@mad/server`, `@mad/web`, `@mad/admin`
- **Related Documents**:
  - [ARCHITECTURE.md](../../ARCHITECTURE.md)
  - [API_CONTRACTS.md](../../API_CONTRACTS.md)
  - [ADR-001 (Booking Ownership)](ADR-001-booking-ownership.md)

---

## 1. Context & Problem Statement

Prior to this architecture decision:
1. **Tax Overcharge**: Taxes (GST / Sales Tax) were calculated on the pre-discount gross subtotal before applying promo code discounts, causing customers to pay full sales tax on the discounted portion of their tickets.
2. **Usage Limit Corruption**: The expiration service (`BookingLifecycleService.expireBooking`) decremented `Coupon.usedCount` when abandoned pending checkouts expired, despite `usedCount` only being incremented upon payment confirmation (`status: CONFIRMED`). This leaked promo code usage limits and permitted infinite redemptions.

---

## 2. Decision & Architectural Invariants

### Invariant 1 — Authoritative Pricing & Net Tax Calculation
- **Owner**: Server (`BookingCreationService.createBooking`).
- **Calculation Order**:
  1. Calculate Gross Subtotal ($\sum \text{tierPrice} \times \text{quantity}$).
  2. Compute Promo Code Discount (percentage with `maxDiscount` cap, or fixed value, clamped to `subtotal`).
  3. Compute **Net Taxable Subtotal**: $\text{netSubtotal} = \max(0, \text{subtotal} - \text{discount})$.
  4. Compute **Net Ticket Tax**: $\text{netTicketTax} = \text{round}(\text{netSubtotal} \times \text{effectiveTaxRate})$.
  5. Compute **Convenience Fee & Fee Tax**: $\text{convenienceFee} = \text{baseFee} \times \text{ticketCount}$, $\text{feeTax} = \text{round}(\text{convenienceFee} \times \text{effectiveTaxRate})$.
  6. Final Authoritative Amount: $\text{totalAmount} = \max(0, \text{netSubtotal} + \text{convenienceFee} + \text{netTicketTax} + \text{feeTax})$.

### Invariant 2 — Atomic Coupon Redemption Lifecycle
- **Owner**: Server (`PaymentBookingService` & `BookingLifecycleService`).
- **State Transitions**:
  - `createBooking`: Validates coupon rules (`validFrom`, `validUntil`, `usedCount < usageLimit`, `minOrderAmount`, category/event scope). **Zero mutations to `usedCount`**.
  - `confirmBooking`: Inside the MongoDB session transaction, executes:
    ```typescript
    await Coupon.updateOne(
      { _id: booking.couponId, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      { $inc: { usedCount: 1 } },
      { session }
    );
    ```
  - `expireBooking`: **Zero mutations to `usedCount`**. Pending bookings never incremented `usedCount`.
  - `cancelBooking` / `refundBooking`: Decrements `usedCount` **only if** the booking was in `CONFIRMED` state (`previousStatus === BookingStatus.CONFIRMED || booking.confirmedAt`).

### Invariant 3 — Frontend Presentation Authority
- The frontend (`CheckoutPricing.tsx`) never calculates payable totals or discounts independently for checkout transactions; it renders the server-authoritative line items from the `Booking` document.

---

## 3. Consequences

- **Positive**: Eliminates tax calculation discrepancies, protects platform against infinite coupon reuse, and enforces strict Single Source of Truth (SSOT).
- **Compliance**: Fully verified by automated regression test suites in `apps/server/src/services/public/booking.service.test.ts` and `apps/server/src/services/admin/booking.service.test.ts`.
