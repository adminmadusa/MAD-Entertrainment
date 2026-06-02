import * as React from "react";
import { Section, Text, Heading } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeader } from "./components/EmailHeader";
import { EmailFooter } from "./components/EmailFooter";
import { renderTemplate } from "../render-template";

export interface PartialRefundData {
  customerName: string;
  bookingReference: string;
  originalAmount: number;
  refundAmount: number;
  remainingAmount: number;
  reason?: string;
  currency?: string;
}

const previewData: PartialRefundData = {
  customerName: "John Doe",
  bookingReference: "MAD-2026-12345",
  originalAmount: 2999,
  refundAmount: 1000,
  remainingAmount: 1999,
  reason: "Tier adjustment refund",
  currency: "INR",
};

interface PartialRefundEmailProps {
  data?: PartialRefundData;
}

export default function PartialRefundEmail({
  data = previewData,
}: PartialRefundEmailProps) {
  const {
    customerName,
    bookingReference,
    originalAmount,
    refundAmount,
    remainingAmount,
    reason,
    currency = "INR",
  } = data;

  const currencySymbol = currency === "INR" ? "₹" : currency;

  return (
    <EmailLayout previewText={`Partial Refund Completed — ${bookingReference}`}>
      <EmailHeader />

      <Section style={cardStyle}>
        <Section style={badgeContainer}>
          <Text style={badgeStyle}>✓ PARTIAL REFUND COMPLETED</Text>
        </Section>

        <Heading style={titleStyle}>Partial Refund Successful</Heading>

        <Text style={greetingStyle}>
          Hi <strong style={whiteText}>{customerName}</strong>,
          <br />
          your partial refund has been processed. Here is the refund breakdown.
        </Text>

        <Section style={detailBoxStyle}>
          <Text style={detailLabelStyle}>Booking Reference</Text>
          <Text style={detailValueStyle}>{bookingReference}</Text>

          <Text style={detailLabelStyle}>Original Order Amount</Text>
          <Text style={detailValueText}>
            {currencySymbol}
            {originalAmount.toLocaleString("en-IN")}
          </Text>

          <Text style={detailLabelStyle}>Refunded Amount</Text>
          <Text style={amountStyle}>
            {currencySymbol}
            {refundAmount.toLocaleString("en-IN")}
          </Text>

          <Text style={detailLabelStyle}>Remaining Balance</Text>
          <Text style={detailValueText}>
            {currencySymbol}
            {remainingAmount.toLocaleString("en-IN")}
          </Text>

          {reason && (
            <>
              <Text style={detailLabelStyle}>Reason</Text>
              <Text style={detailValueText}>{reason}</Text>
            </>
          )}
        </Section>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

export async function partialRefundHtml(
  data: PartialRefundData,
): Promise<string> {
  return renderTemplate(<PartialRefundEmail data={data} />);
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
  background: "rgba(245, 158, 11, 0.13)",
  color: "#f59e0b",
  border: "1px solid rgba(245, 158, 11, 0.33)",
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
  margin: "0 0 24px",
  fontSize: "15px",
  color: "#c0c0c0",
  lineHeight: "1.5",
};

const whiteText: React.CSSProperties = {
  color: "#ffffff",
};

const detailBoxStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "10px",
  padding: "24px",
  marginBottom: "16px",
};

const detailLabelStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  color: "#666666",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const detailValueStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "18px",
  fontWeight: 700,
  color: "#a78bfa",
  fontFamily: "monospace",
  letterSpacing: "1.5px",
};

const amountStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "22px",
  fontWeight: 900,
  color: "#f59e0b",
};

const detailValueText: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "14px",
  color: "#e0e0e0",
};
