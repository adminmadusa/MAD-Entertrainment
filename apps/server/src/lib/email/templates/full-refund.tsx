import * as React from "react";
import { Section, Text, Heading } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeader } from "./components/EmailHeader";
import { EmailFooter } from "./components/EmailFooter";
import { renderTemplate } from "../render-template";

export interface FullRefundData {
  customerName: string;
  bookingReference: string;
  eventTitle: string;
  refundAmount: number;
  refundDate: string;
  settlementTimeline: string;
  currency?: string;
}

const previewData: FullRefundData = {
  customerName: "John Doe",
  bookingReference: "MAD-2026-12345",
  eventTitle: "MAD Summer Festival",
  refundAmount: 1999,
  refundDate: "June 2, 2026",
  settlementTimeline: "5-7 business days",
  currency: "INR",
};

interface FullRefundEmailProps {
  data?: FullRefundData;
}

export default function FullRefundEmail({
  data = previewData,
}: FullRefundEmailProps) {
  const {
    customerName,
    bookingReference,
    eventTitle,
    refundAmount,
    refundDate,
    settlementTimeline,
    currency = "INR",
  } = data;

  const currencySymbol = currency === "INR" ? "₹" : currency;

  return (
    <EmailLayout previewText={`Refund Completed — ${bookingReference}`}>
      <EmailHeader />

      <Section style={cardStyle}>
        <Section style={badgeContainer}>
          <Text style={badgeStyle}>✓ REFUND COMPLETED</Text>
        </Section>

        <Heading style={titleStyle}>Refund Successful</Heading>

        <Text style={greetingStyle}>
          Hi <strong style={whiteText}>{customerName}</strong>,
          <br />
          your refund has been processed successfully. Here are the details of the refund.
        </Text>

        <Section style={detailBoxStyle}>
          <Text style={detailLabelStyle}>Booking Reference</Text>
          <Text style={detailValueStyle}>{bookingReference}</Text>

          <Text style={detailLabelStyle}>Event Name</Text>
          <Text style={eventTitleStyle}>{eventTitle}</Text>

          <Text style={detailLabelStyle}>Refunded Amount</Text>
          <Text style={amountStyle}>
            {currencySymbol}
            {refundAmount.toLocaleString("en-IN")}
          </Text>

          <Text style={detailLabelStyle}>Refund Date</Text>
          <Text style={detailValueText}>{refundDate}</Text>

          <Text style={detailLabelStyle}>Settlement Timeline</Text>
          <Text style={detailValueText}>{settlementTimeline}</Text>
        </Section>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

export async function fullRefundHtml(data: FullRefundData): Promise<string> {
  return renderTemplate(<FullRefundEmail data={data} />);
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
  background: "rgba(59, 130, 246, 0.13)",
  color: "#60a5fa",
  border: "1px solid rgba(59, 130, 246, 0.33)",
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

const eventTitleStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "16px",
  fontWeight: 700,
  color: "#ffffff",
};

const amountStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "22px",
  fontWeight: 900,
  color: "#ef4444",
};

const detailValueText: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "14px",
  color: "#e0e0e0",
};
