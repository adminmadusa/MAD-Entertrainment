import { describe, it, expect } from "vitest";

import { bookingConfirmationHtml } from "./booking-confirmation";
import { eventCancellationHtml } from "./event-cancellation";
import { fullRefundHtml } from "./full-refund";
import { partialRefundHtml } from "./partial-refund";
import { paymentFailureHtml } from "./payment-failure";
import { ticketDeliveryHtml } from "./ticket-delivery";

describe("Email Templates Render Tests", () => {
  describe("Booking Confirmation Email", () => {
    it("should render successfully and contain booking reference and customer name", async () => {
      const data = {
        customerName: "Alice Smith",
        eventTitle: "Super Concert 2026",
        bookingReference: "MAD-CONF-111",
        eventDate: "September 15, 2026",
        tickets: [{ tierName: "VIP", quantity: 2, price: 1500 }],
        totalAmount: 3000,
        currency: "INR",
        ticketUrl: "https://www.madentertainments.net/tickets?ref=MAD-CONF-111",
        manageTicketsUrl: "https://www.madentertainments.net/tickets",
        hasPdfAttachment: true,
      };

      const html = await bookingConfirmationHtml(data);
      expect(html).toContain("Alice Smith");
      expect(html).toContain("Super Concert 2026");
      expect(html).toContain("MAD-CONF-111");
      expect(html).toContain("September 15, 2026");
      expect(html).toContain("VIP");
      expect(html).toContain("Total Paid");
      expect(html).toContain("₹3,000");
      expect(html).toContain("View Ticket Online");
      expect(html).toContain("https://www.madentertainments.net/tickets?ref=MAD-CONF-111");
      expect(html).toContain("Manage My Tickets");
      expect(html).toContain("attached as a PDF document");
    });
  });

  describe("Event Cancellation Email", () => {
    it("should render successfully and contain cancellation message", async () => {
      const data = {
        customerName: "Bob Jones",
        eventTitle: "Cancelled Festival",
        eventDate: "October 10, 2026",
        venueName: "Open Air Arena",
        bookingReference: "MAD-CANCEL-222",
      };

      const html = await eventCancellationHtml(data);
      expect(html).toContain("Bob Jones");
      expect(html).toContain("Cancelled Festival");
      expect(html).toContain("Open Air Arena");
      expect(html).toContain("MAD-CANCEL-222");
      expect(html).toContain("we regret to inform you that the event");
    });
  });

  describe("Full Refund Email", () => {
    it("should render successfully and contain refund amount", async () => {
      const data = {
        customerName: "Charlie Brown",
        bookingReference: "MAD-REF-333",
        eventTitle: "Retro Night",
        refundAmount: 999,
        refundDate: "June 25, 2026",
        settlementTimeline: "3-5 days",
        currency: "INR",
      };

      const html = await fullRefundHtml(data);
      expect(html).toContain("Charlie Brown");
      expect(html).toContain("MAD-REF-333");
      expect(html).toContain("Retro Night");
      expect(html).toContain("₹999");
      expect(html).toContain("Refund Successful");
    });
  });

  describe("Partial Refund Email", () => {
    it("should render successfully and contain original and refunded amount", async () => {
      const data = {
        customerName: "David Green",
        bookingReference: "MAD-REF-444",
        originalAmount: 4999,
        refundAmount: 2000,
        remainingAmount: 2999,
        reason: "VIP upgrade cancellation",
        currency: "INR",
      };

      const html = await partialRefundHtml(data);
      expect(html).toContain("David Green");
      expect(html).toContain("MAD-REF-444");
      expect(html).toContain("₹4,999");
      expect(html).toContain("₹2,000");
      expect(html).toContain("₹2,999");
      expect(html).toContain("VIP upgrade cancellation");
      expect(html).toContain("Partial Refund Successful");
    });
  });

  describe("Payment Failure Email", () => {
    it("should render successfully and contain retry link and warning message", async () => {
      const data = {
        customerName: "Emma Watson",
        eventTitle: "Premiere Night",
        bookingReference: "MAD-FAIL-555",
        retryUrl: "https://mad.entertainment/retry/MAD-FAIL-555",
      };

      const html = await paymentFailureHtml(data);
      expect(html).toContain("Emma Watson");
      expect(html).toContain("Premiere Night");
      expect(html).toContain("MAD-FAIL-555");
      expect(html).toContain("https://mad.entertainment/retry/MAD-FAIL-555");
      expect(html).toContain("Retry Payment");
      expect(html).toContain("Checkout Session Interrupted");
    });
  });

  describe("Ticket Delivery Email", () => {
    it("should render successfully and contain venue and qr placeholder instructions", async () => {
      const data = {
        customerName: "Frank Miller",
        eventTitle: "Rock Fest",
        eventDate: "November 5, 2026",
        venue: "Central Plaza",
        bookingReference: "MAD-TIX-666",
      };

      const html = await ticketDeliveryHtml(data);
      expect(html).toContain("Frank Miller");
      expect(html).toContain("Rock Fest");
      expect(html).toContain("Central Plaza");
      expect(html).toContain("MAD-TIX-666");
      expect(html).toContain("QR ticket will appear here once ticket delivery is activated");
    });
  });
});
