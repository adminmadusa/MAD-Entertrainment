import { Link, Text } from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

export interface PaymentFailureData {
  customerName: string;
  eventTitle: string;
  bookingReference: string;
  retryUrl: string;
}

const previewData: PaymentFailureData = {
  customerName: "John Doe",
  eventTitle: "MAD Summer Festival",
  bookingReference: "MAD-2026-12345",
  retryUrl: "https://mad.entertainment/checkout/MAD-2026-12345",
};

interface PaymentFailureEmailProps {
  data?: PaymentFailureData;
}

export default function PaymentFailureEmail({
  data = previewData,
}: PaymentFailureEmailProps) {
  const { customerName, eventTitle, bookingReference, retryUrl } = data;

  return (
    <EmailBase
      previewText={`Payment Failed — ${bookingReference}`}
      badgeText="✕ PAYMENT FAILED"
      badgeStyle={{
        background: "rgba(239, 68, 68, 0.13)",
        color: "#f87171",
        border: "1px solid rgba(239, 68, 68, 0.33)",
      }}
      title="Checkout Session Interrupted"
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{customerName}</strong>,
          <br />
          we noticed your payment checkout session for the event{" "}
          <strong style={emailSharedStyles.whiteText}>"{eventTitle}"</strong> could not be completed successfully.
        </>
      }
    >
      <Text style={emailSharedStyles.bodyText}>
        Don't worry, your event tickets have not been purchased, but you can retry the payment directly using the link below to finalize your booking:
      </Text>

      <Text style={buttonContainer}>
        <Link href={retryUrl} style={buttonStyle}>
          Retry Payment
        </Link>
      </Text>

      <Text style={subtextStyle}>
        Booking Reference: <span style={emailSharedStyles.bookingRef}>{bookingReference}</span>
      </Text>
    </EmailBase>
  );
}

export async function paymentFailureHtml(
  data: PaymentFailureData,
): Promise<string> {
  return renderTemplate(<PaymentFailureEmail data={data} />);
}

// Inline Styles specific to Payment Failure
const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#8b5cf6",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  border: "1px solid #7c3aed",
};

const subtextStyle: React.CSSProperties = {
  margin: "24px 0 0",
  fontSize: "12px",
  color: "#666666",
  textAlign: "center" as const,
};
