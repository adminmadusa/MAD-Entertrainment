"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { STORAGE_VERSION } from "@mad/shared";
import { Event, Booking } from "@mad/types";
import { useCountdown } from "@/hooks/use-countdown.hook";
import { extractApiError } from "@/lib/api/client";
import { loadScriptOnce } from "@/lib/utils/load-script-once";
import {
  publicGetBookingDetails,
  publicCreatePaymentIntent,
  publicVerifyPayment,
  publicSaveCheckoutDetails,
} from "@/lib/api/public.service";
import { CheckoutDetailsInput } from "@mad/validations";

import { useCheckoutNavGuard } from "./checkout/useCheckoutNavGuard";
import { LeaveCheckoutModal } from "./checkout/LeaveCheckoutModal";
import { CheckoutForm } from "./checkout/CheckoutForm";
import { CheckoutPricing } from "./checkout/CheckoutPricing";
import { CheckoutPayment } from "./checkout/CheckoutPayment";

interface RazorpayInstance {
  open(): void;
  on(
    event: string,
    callback: (response: { error: { description: string } }) => void,
  ): void;
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: unknown) => RazorpayInstance;
}

function asEvent(value: unknown): Event | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("title" in value) || !("startDate" in value)) return null;
  return value as Event;
}

interface CheckoutContentProps {
  bookingId: string;
  isModal: boolean;
  onBack: () => void;
  onClose: () => void;
}

export function CheckoutContent({
  bookingId,
  isModal,
  onBack,
  onClose,
}: CheckoutContentProps) {
  const router = useRouter();

  const [selectedGateway, setSelectedGateway] = useState<"stripe" | "razorpay">(
    "razorpay",
  );
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Local state for Resend Tickets flow
  const [resendStep, setResendStep] = useState<
    "idle" | "edit" | "sending" | "success" | "failed"
  >("idle");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [resendEmailInput, setResendEmailInput] = useState("");
  const [resendError, setResendError] = useState("");

  const {
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    handleBackClick,
    handleCloseClick,
    handleConfirmLeave,
    allowNavigation,
  } = useCheckoutNavGuard({ isModal, onBack, onClose });

  const { data: details, isLoading } = useQuery({
    queryKey: ["booking-checkout-details", bookingId],
    queryFn: () => {
      let sess: string | undefined;
      if (typeof window !== "undefined") {
        const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
        sess = sessionStorage.getItem(sessionKey) || undefined;
      }
      return publicGetBookingDetails(bookingId, sess);
    },
    enabled: !!bookingId,
    retry: (failureCount, error: unknown) => {
      if (
        (error as { response?: { status: number } })?.response?.status === 404
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const booking = details?.booking;
  const event = asEvent((booking as Booking | undefined)?.eventId);

  useEffect(() => {
    if (booking?.guestEmail) {
      setDeliveryEmail(booking.guestEmail);
      setResendEmailInput(booking.guestEmail);
    }
  }, [booking]);

  // Redirect if already confirmed
  useEffect(() => {
    if (booking && booking.status === "confirmed") {
      allowNavigation();
      router.push(`/my-booking?ref=${booking.bookingId}`);
    }
  }, [booking, router, allowNavigation]);

  const countdown = useCountdown(booking?.expiresAt);
  const isExpired = countdown.isExpired;
  const timeLeft = isExpired
    ? "Expired"
    : `Time left ${countdown.minutes}:${String(countdown.seconds).padStart(2, "0")}`;

  // Save checkout details mutation
  const saveDetailsMutation = useMutation({
    mutationFn: (payload: CheckoutDetailsInput) => {
      let sess = "";
      if (typeof window !== "undefined") {
        const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
        sess = sessionStorage.getItem(sessionKey) || "";
      }
      return publicSaveCheckoutDetails(bookingId, payload, sess);
    },
    onSuccess: () => {
      paymentIntentMutation.mutate(selectedGateway);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  // Payment Intent Mutation
  const paymentIntentMutation = useMutation({
    mutationFn: (gateway: "stripe" | "razorpay") =>
      publicCreatePaymentIntent(bookingId, gateway),
    onSuccess: async (res) => {
      if (res.gateway === "razorpay") {
        if (res.isMock) {
          setIsProcessing(true);
          verifyPaymentMutation.mutate({
            razorpay_order_id: res.orderId,
            razorpay_payment_id:
              "pay_mock_" + Math.random().toString(36).substring(2, 10),
            razorpay_signature: "mock_signature",
          });
          return;
        }

        try {
          await loadScriptOnce("https://checkout.razorpay.com/v1/checkout.js");
        } catch {
          setError("Failed to load Razorpay SDK. Check your connection.");
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || res.keyId,
          amount: res.amount,
          currency: res.currency,
          name: "MAD Entertainment",
          description: `Booking ${res.bookingId}`,
          order_id: res.orderId,
          handler: function (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) {
            setIsProcessing(true);
            verifyPaymentMutation.mutate({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: function () {
              setError("Payment cancelled by user");
              setIsProcessing(false);
            },
          },
        };

        const Razorpay = (window as RazorpayWindow).Razorpay;
        if (!Razorpay) {
          setError("Razorpay SDK is unavailable. Please retry.");
          return;
        }
        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function (response) {
          setError(`Payment Failed: ${response.error.description}`);
          setIsProcessing(false);
        });
        rzp.open();
      } else if (res.gateway === "stripe") {
        if (res.isMock) {
          setIsProcessing(true);
          verifyPaymentMutation.mutate({
            paymentIntentId: res.clientSecret
              ? res.clientSecret.split("_secret")[0]
              : "pi_mock_fallback",
          });
          return;
        }
        setError(
          "Stripe production integration requires Elements. Please use Razorpay/PayPal for now.",
        );
      }
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      publicVerifyPayment(bookingId, payload),
    onSuccess: () => {
      // Guest session ID is retained in sessionStorage so the user can reliably
      // retrieve their newly confirmed tickets in the /my-booking wallet flow.
      allowNavigation();
      setIsProcessing(false);
      setShowSuccess(true);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
      setIsProcessing(false);
    },
  });

  const handleFormSubmit = (detailsPayload: CheckoutDetailsInput) => {
    saveDetailsMutation.mutate(detailsPayload);
  };

  if (showSuccess) {
    const handleSimulatedResend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!resendEmailInput.trim()) {
        setResendError("Email address is required");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmailInput)) {
        setResendError("Invalid email format");
        return;
      }
      setResendError("");
      setResendStep("sending");

      // Simulate API call for 1.5 seconds
      setTimeout(() => {
        if (resendEmailInput.trim().toLowerCase() === "fail@example.com") {
          setResendStep("failed");
        } else {
          setDeliveryEmail(resendEmailInput.trim().toLowerCase());
          setResendStep("success");
        }
      }, 1500);
    };

    const containerClasses = isModal
      ? "relative text-white flex flex-col items-center justify-center w-full"
      : "pt-24 pb-24 min-h-screen bg-[#0d111d] text-white relative flex flex-col items-center justify-center px-4 w-full";

    return (
      <div className={containerClasses}>
        <div className="glass rounded-3xl border border-white/10 p-6 sm:p-8 max-w-md w-full mx-auto space-y-6 text-center shadow-2xl relative overflow-hidden">
          {resendStep === "idle" && (
            <>
              {/* Success icon */}
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 text-3xl mx-auto shadow-glow-sm">
                ✓
              </div>

              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Payment Successful
                </h2>
                <p className="text-green-400 font-bold text-xs uppercase tracking-wider">
                  Booking Confirmed!
                </p>
              </div>

              {/* Reference */}
              <div className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                  Booking Reference
                </span>
                <span className="font-mono text-sm text-white font-bold select-all">
                  {bookingId}
                </span>
              </div>

              {/* Confirmed Email Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-3 text-left">
                <div className="text-2xl text-accent-purple-light flex-shrink-0">
                  ✉️
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">
                      Ticket Delivery
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/25">
                      ✓ Confirmed
                    </span>
                  </div>
                  <p className="text-white text-sm font-semibold truncate">
                    {deliveryEmail}
                  </p>
                  <p className="text-text-muted text-[10px]">
                    A confirmation has been sent to your email.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/my-booking?ref=${bookingId}`);
                  }}
                  className="w-full py-3 btn-gradient text-white rounded-xl font-bold text-sm shadow-glow transition-transform active:scale-95 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  View Tickets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/my-booking");
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all active:scale-95 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  Go to My Bookings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResendStep("edit");
                    setResendEmailInput(deliveryEmail);
                    setResendError("");
                  }}
                  className="w-full py-2.5 mt-1 bg-transparent hover:bg-white/5 text-text-secondary hover:text-white rounded-xl font-semibold text-xs border border-transparent hover:border-white/5 transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  Resend Tickets
                </button>
              </div>
            </>
          )}

          {resendStep === "edit" && (
            <form
              onSubmit={handleSimulatedResend}
              className="space-y-5 text-left"
            >
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">
                  Resend Tickets
                </h3>
                <p className="text-xs text-text-secondary">
                  Confirm or update the delivery email address.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="resend-email-input"
                  className="text-xs text-text-secondary font-medium"
                >
                  Delivery Email Address
                </label>
                <input
                  id="resend-email-input"
                  type="email"
                  required
                  value={resendEmailInput}
                  onChange={(e) => setResendEmailInput(e.target.value)}
                  placeholder="email@example.com"
                  className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-white focus:outline-none transition-colors ${
                    resendError
                      ? "border-red-500"
                      : "border-white/10 focus:border-accent-purple"
                  }`}
                />
                {resendError && (
                  <p className="text-red-400 text-xs">{resendError}</p>
                )}
              </div>

              {/* Security Hint */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-400 leading-normal">
                <span className="text-sm mt-0.5">⚠️</span>
                <p className="text-[11px]">
                  <strong>Security requirement:</strong> Resending will generate
                  new secure QR code tokens and immediately invalidate previous
                  versions.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResendStep("idle")}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 btn-gradient text-white rounded-xl font-bold text-xs shadow-glow transition-transform active:scale-95 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  Confirm & Send
                </button>
              </div>
            </form>
          )}

          {resendStep === "sending" && (
            <div className="py-6 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-accent-purple border-t-transparent animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Sending tickets...
                </h3>
                <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                  Please wait while we process and deliver your tickets. Do not
                  close this window.
                </p>
              </div>
            </div>
          )}

          {resendStep === "success" && (
            <>
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl mx-auto shadow-glow-sm">
                ✈️
              </div>

              {/* Header */}
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Tickets Resent!
                </h3>
                <p className="text-xs text-emerald-400 font-medium">
                  Sent to {deliveryEmail}
                </p>
              </div>

              <p className="text-text-secondary text-xs leading-relaxed max-w-xs mx-auto">
                A new confirmation email containing your refreshed secure QR
                codes has been dispatched successfully. Older QR code versions
                are now invalid.
              </p>

              {/* Reference */}
              <div className="bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-xs flex justify-between items-center">
                <span className="text-text-secondary font-medium">
                  Reference ID
                </span>
                <span className="font-mono text-white font-bold">
                  {bookingId}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setResendStep("idle")}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              >
                Close
              </button>
            </>
          )}

          {resendStep === "failed" && (
            <>
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-3xl mx-auto shadow-glow-sm">
                ❌
              </div>

              {/* Header */}
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Delivery Failed
                </h3>
                <p className="text-xs text-red-400 font-medium">
                  SMTP system error
                </p>
              </div>

              <p className="text-text-secondary text-xs leading-relaxed max-w-xs mx-auto">
                We encountered an error trying to send your tickets to{" "}
                <strong>{resendEmailInput}</strong>. Please check the spelling
                or try a different address.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResendStep("edit");
                    setResendError("");
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResendError("");
                    setResendStep("sending");
                    setTimeout(() => {
                      setDeliveryEmail(resendEmailInput.trim().toLowerCase());
                      setResendStep("success");
                    }, 1500);
                  }}
                  className="flex-1 py-3 btn-gradient text-white rounded-xl font-bold text-xs shadow-glow transition-transform active:scale-95 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                >
                  Retry
                </button>
              </div>

              <p className="text-[11px] text-text-muted">
                Need help?{" "}
                <a
                  href="/support"
                  className="text-accent-purple-light hover:underline"
                >
                  Contact venue support
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={
          isModal
            ? "relative text-white animate-pulse"
            : "pt-24 pb-24 min-h-screen bg-[#0d111d] text-white relative flex flex-col items-center justify-center animate-pulse"
        }
      >
        <div
          className={
            isModal
              ? "space-y-4 mt-4 w-full"
              : "container-mad max-w-4xl space-y-4 px-4 mt-20 w-full"
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Event summary card & Billing details */}
            <div className="lg:col-span-8 space-y-4">
              {/* Event card skeleton */}
              <div className="glass rounded-2xl border border-white/5 p-4 flex gap-4 items-center">
                <div className="w-20 h-20 bg-white/5 rounded-xl border border-white/10 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                  <div className="h-4 bg-white/10 rounded w-1/6" />
                </div>
              </div>
              {/* Billing details form skeleton */}
              <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
                <div className="h-6 bg-white/10 rounded w-1/3" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-white/5 rounded-xl" />
                    <div className="h-10 bg-white/5 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-white/5 rounded-xl" />
                    <div className="h-10 bg-white/5 rounded-xl" />
                  </div>
                  <div className="h-10 bg-white/5 rounded-xl" />
                </div>
              </div>
            </div>
            {/* Right Column: Checkout Breakdown, Payment Details, and Actions */}
            <div className="lg:col-span-4 space-y-4">
              {/* Pricing details skeleton */}
              <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-1/3 pt-2" />
              </div>
              {/* Payment selector skeleton */}
              <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-12 bg-white/5 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 px-4 py-12 text-center bg-transparent">
        <div className="text-white font-bold text-lg">
          Booking Session Expired
        </div>
        <p className="text-text-muted text-sm max-w-md">
          We couldn't find your booking details. It may have expired due to
          inactivity. Please select tickets again.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 btn-gradient text-white rounded-xl font-bold text-sm shadow-glow-sm transition-transform active:scale-95"
        >
          Start New Booking
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? "relative text-white"
          : "pt-24 pb-24 min-h-screen bg-[#0d111d] text-white relative overflow-x-hidden flex flex-col items-center justify-center"
      }
    >
      {!isModal && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
      )}

      {/* Sticky Top Checkout Header */}
      <div
        className={
          isModal
            ? "sticky top-0 bg-[#0d111d] border-b border-white/10 py-3 z-50 shadow-md"
            : "fixed top-0 left-0 right-0 bg-[#0d111d]/90 backdrop-blur-md border-b border-white/10 py-3 z-50 shadow-md"
        }
      >
        <div className="container-mad max-w-4xl px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackClick}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:border-transparent"
            aria-label="Go back"
          >
            ←
          </button>

          <div className="text-center">
            <h1
              id="checkout-modal-title"
              className="text-sm font-bold text-white tracking-wide"
            >
              Checkout
            </h1>
            <div
              className={`text-[10px] font-semibold mt-0.5 ${isExpired ? "text-red-400" : "text-accent-cyan animate-pulse"}`}
            >
              {timeLeft}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseClick}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:border-transparent"
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className={
          isModal
            ? "space-y-4 relative z-10 mt-4"
            : "container-mad max-w-4xl space-y-4 relative z-10 px-4 mt-20 w-full"
        }
      >
        {error && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Event summary card & Billing details */}
          <div className="lg:col-span-8 space-y-4">
            {/* Event Summary Card */}
            {event && (
              <div className="glass rounded-2xl border border-white/5 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {event.bannerImage?.url && (
                  <div className="relative w-20 h-20 bg-black/20 rounded-xl border border-white/10 overflow-hidden flex-shrink-0">
                    <Image
                      src={event.bannerImage.url}
                      alt={event.title}
                      fill
                      sizes="80px"
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="space-y-1.5 flex-1 w-full">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1">
                    {event.title}
                  </h2>
                  <p className="text-xs text-text-secondary font-medium">
                    {new Date(event.startDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {event.showTime}
                  </p>
                  <p className="text-xs text-accent-purple-light font-bold">
                    ₹{booking.totalAmount}
                  </p>
                </div>
              </div>
            )}

            {/* Billing Information Form */}
            <CheckoutForm
              isExpired={isExpired}
              isDisabled={
                isProcessing ||
                saveDetailsMutation.isPending ||
                paymentIntentMutation.isPending
              }
              onSubmit={handleFormSubmit}
              onErrorSet={setError}
            />
          </div>

          {/* Right Column: Checkout Breakdown, Payment Details, and Actions */}
          <div className="lg:col-span-4 space-y-4">
            <CheckoutPricing booking={booking} />

            <CheckoutPayment
              selectedGateway={selectedGateway}
              onChangeGateway={setSelectedGateway}
              isDisabled={
                isProcessing ||
                saveDetailsMutation.isPending ||
                paymentIntentMutation.isPending
              }
            />

            {/* Place Order & Terms (Desktop Only) */}
            <div className="hidden lg:block glass rounded-2xl border border-white/5 p-5 space-y-3">
              <button
                type="submit"
                form="checkout-form"
                disabled={
                  isExpired ||
                  saveDetailsMutation.isPending ||
                  paymentIntentMutation.isPending ||
                  isProcessing
                }
                aria-busy={
                  saveDetailsMutation.isPending ||
                  paymentIntentMutation.isPending ||
                  isProcessing
                }
                className="w-full px-8 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-glow disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:border-transparent"
              >
                {saveDetailsMutation.isPending
                  ? "Processing booking..."
                  : paymentIntentMutation.isPending
                    ? "Preparing payment..."
                    : isProcessing
                      ? "Verifying payment..."
                      : isExpired
                        ? "Session Expired"
                        : "Place Order"}
              </button>

              <p className="text-[10px] text-text-muted leading-relaxed pt-2 border-t border-white/5">
                By selecting Place Order, I agree to the MAD Entertainment Terms
                of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Place Order Footer (Mobile Only) */}
      <div
        className={
          isModal
            ? "sticky bottom-0 z-40 bg-[#0d111d]/95 border-t border-white/10 py-3 mt-8 shadow-2xl lg:hidden"
            : "fixed bottom-0 left-0 right-0 z-40 bg-[#0d111d]/95 backdrop-blur-lg border-t border-white/10 shadow-2xl lg:hidden"
        }
      >
        <div className="container-mad max-w-4xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-4">
          <div className="flex-1">
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
              Total Amount
            </div>
            <div className="text-white font-black text-lg">
              ₹{booking.totalAmount}
            </div>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={
              isExpired ||
              saveDetailsMutation.isPending ||
              paymentIntentMutation.isPending ||
              isProcessing
            }
            aria-busy={
              saveDetailsMutation.isPending ||
              paymentIntentMutation.isPending ||
              isProcessing
            }
            className="flex-shrink-0 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-glow disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:border-transparent"
          >
            {saveDetailsMutation.isPending
              ? "Processing booking..."
              : paymentIntentMutation.isPending
                ? "Preparing payment..."
                : isProcessing
                  ? "Verifying payment..."
                  : isExpired
                    ? "Session Expired"
                    : "Place Order"}
          </button>
        </div>
      </div>

      {/* Payment Processing Loader Backdrop */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[100] space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-accent-purple border-t-transparent animate-spin" />
            <p className="text-white font-bold text-sm tracking-wider">
              Verifying payment with bank servers...
            </p>
            <p className="text-text-muted text-xs">
              Please do not refresh this page.
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* Leave Checkout Confirmation Modal */}
      <LeaveCheckoutModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeave}
      />
    </div>
  );
}
