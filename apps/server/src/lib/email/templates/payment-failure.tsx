import * as React from "react";
import { Section, Text, Heading, Link } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeader } from "./components/EmailHeader";
import { EmailFooter } from "./components/EmailFooter";
import { renderTemplate } from "../render-template";

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
    <EmailLayout previewText={`Payment Failed — ${bookingReference}`}>
      <EmailHeader />

      <Section style={cardStyle}>
        <Section style={badgeContainer}>
          <Text style={badgeStyle}>✕ PAYMENT FAILED</Text>
        </Section>

        <Heading style={titleStyle}>Checkout Session Interrupted</Heading>

        <Text style={greetingStyle}>
          Hi <strong style={whiteText}>{customerName}</strong>,
          <br />
          we noticed your payment checkout session for the event{" "}
          <strong style={whiteText}>"{eventTitle}"</strong> could not be completed successfully.
        </Text>

        <Text style={textStyle}>
          Don't worry, your event tickets have not been purchased, but you can retry the payment directly using the link below to finalize your booking:
        </Text>

        <Section style={buttonContainer}>
          <Link href={retryUrl} style={buttonStyle}>
            Retry Payment
          </Link>
        </Section>

        <Text style={subtextStyle}>
          Booking Reference: <span style={monospaceText}>{bookingReference}</span>
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

export async function paymentFailureHtml(
  data: PaymentFailureData,
): Promise<string> {
  return renderTemplate(<PaymentFailureEmail data={data} />);
}

// Inline Styles
const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  borderRadius: "16px",
  border: "1px solid #2a2a2a",
  padding: "32px",
};

const badgeContainer: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(239, 68, 68, 0.13)",
  color: "#f87171",
  border: "1px solid rgba(239, 68, 68, 0.33)",
  borderRadius: "999px",
  padding: "6px 20px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.5px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  textAlign: "center" as const,
  fontFamily: "Outfit, sans-serif",
};

const greetingStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "15px",
  color: "#c0c0c0",
  lineHeight: "1.5",
};

const textStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "14px",
  color: "#a0a0a0",
  lineHeight: "1.5",
};

const whiteText: React.CSSProperties = {
  color: "#ffffff",
};

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

const monospaceText: React.CSSProperties = {
  fontFamily: "monospace",
  color: "#a78bfa",
  fontWeight: "bold",
  letterSpacing: "1px",
};
