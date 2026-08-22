import { describe, it, expect } from "vitest";

import { bookingConfirmationHtml } from "./booking-confirmation";
import { eventCancellationHtml } from "./event-cancellation";
import { fullRefundHtml } from "./full-refund";
import { partialRefundHtml } from "./partial-refund";
import { paymentFailureHtml } from "./payment-failure";
import { ticketDeliveryHtml } from "./ticket-delivery";

describe("Email Templates Render Tests", () => {
  describe("Booking Confirmation Email", () => {
    it("should render successfully with India GST, discount, convenience fee, and Razorpay details", async () => {
      const data = {
        customerName: "Alice Smith",
        eventTitle: "Super Concert 2026",
        bookingReference: "MAD-CONF-111",
        eventDate: "September 15, 2026",
        eventTime: "07:30 PM IST",
        venueName: "Hyderabad Exhibition Grounds",
        venueAddress: "HITEC City, Hyderabad",
        tickets: [{ tierName: "VIP", quantity: 2, price: 1500 }],
        subtotal: 3000,
        convenienceFee: 60,
        taxLabel: "GST",
        taxPercentage: 18,
        taxAmount: 540,
        discount: 200,
        couponCode: "SAVE200",
        totalAmount: 3400,
        currency: "INR",
        paymentGateway: "Razorpay",
        paymentTransactionId: "pay_xyz987654",
        paidAt: "Sep 10, 2026, 02:15 PM",
        ticketUrl: "https://www.madentertainments.net/tickets?ref=MAD-CONF-111",
        manageTicketsUrl: "https://www.madentertainments.net/tickets",
        hasPdfAttachment: true,
      };

      const html = await bookingConfirmationHtml(data);
      expect(html).toContain("Alice Smith");
      expect(html).toContain("Super Concert 2026");
      expect(html).toContain("MAD-CONF-111");
      expect(html).toContain("September 15, 2026");
      expect(html).toContain("07:30 PM IST");
      expect(html).toContain("Hyderabad Exhibition Grounds");
      expect(html).toContain("VIP");
      expect(html).toContain("Subtotal");
      expect(html).toContain("Convenience Fee");
      expect(html).toContain("GST (18%)");
      expect(html).toContain("SAVE200");
      expect(html).toContain("Total Paid");
      expect(html).toContain("₹3,400");
      expect(html).toContain("RAZORPAY");
      expect(html).toContain("pay_xyz987654");
      expect(html).toContain("View Ticket Online");
      expect(html).toContain("https://www.madentertainments.net/tickets?ref=MAD-CONF-111");
      expect(html).toContain("Manage My Tickets");
      expect(html).toContain("attached as a PDF document");
    });

    it("should render successfully with US Sales Tax and Stripe details", async () => {
      const data = {
        customerName: "John Miller",
        eventTitle: "Austin Music Fest",
        bookingReference: "MAD-US-222",
        eventDate: "October 20, 2026",
        venueName: "Moody Center",
        venueAddress: "2001 Robert Dedman Dr, Austin, TX",
        tickets: [{ tierName: "General Admission", quantity: 2, price: 50 }],
        subtotal: 100,
        convenienceFee: 4,
        taxLabel: "Sales Tax",
        taxPercentage: 8.25,
        taxAmount: 8.25,
        totalAmount: 112.25,
        currency: "USD",
        paymentGateway: "Stripe",
        paymentTransactionId: "pi_stripe_test_123",
        ticketUrl: "https://www.madentertainments.net/tickets?ref=MAD-US-222",
      };

      const html = await bookingConfirmationHtml(data);
      expect(html).toContain("John Miller");
      expect(html).toContain("Austin Music Fest");
      expect(html).toContain("MAD-US-222");
      expect(html).toContain("Moody Center");
      expect(html).toContain("Sales Tax (8.25%)");
      expect(html).toContain("$112.25");
      expect(html).toContain("STRIPE");
      expect(html).toContain("pi_stripe_test_123");
    });

    it("should render successfully with UK VAT breakdown", async () => {
      const data = {
        customerName: "Oliver Twist",
        eventTitle: "London Live Gala",
        bookingReference: "MAD-UK-333",
        eventDate: "November 5, 2026",
        tickets: [{ tierName: "Balcony", quantity: 1, price: 80 }],
        subtotal: 80,
        taxLabel: "VAT",
        taxPercentage: 20,
        taxAmount: 16,
        totalAmount: 96,
        currency: "GBP",
      };

      const html = await bookingConfirmationHtml(data);
      expect(html).toContain("Oliver Twist");
      expect(html).toContain("London Live Gala");
      expect(html).toContain("VAT (20%)");
      expect(html).toContain("£96");
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
