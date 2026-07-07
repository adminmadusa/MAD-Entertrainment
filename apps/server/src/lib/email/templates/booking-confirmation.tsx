import { Section, Text, Row, Column, Heading } from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";
import { EmailFooter } from "./components/EmailFooter";
import { EmailHeader } from "./components/EmailHeader";
import { EmailLayout } from "./components/EmailLayout";

export interface BookingConfirmationData {
  customerName: string;
  eventTitle: string;
  bookingReference: string;
  eventDate: string;
  tickets: { tierName: string; quantity: number; price: number }[];
  totalAmount: number;
  currency?: string;
}

const previewData: BookingConfirmationData = {
  customerName: "John Doe",
  eventTitle: "MAD Summer Festival",
  bookingReference: "MAD-2026-12345",
  eventDate: "August 12, 2026",
  tickets: [
    { tierName: "General Admission", quantity: 2, price: 999 },
    { tierName: "VIP", quantity: 1, price: 1999 },
  ],
  totalAmount: 3997,
  currency: "INR",
};

interface BookingConfirmationEmailProps {
  data?: BookingConfirmationData;
}

export default function BookingConfirmationEmail({
  data = previewData,
}: BookingConfirmationEmailProps) {
  const {
    customerName,
    eventTitle,
    bookingReference,
    eventDate,
    tickets,
    totalAmount,
    currency = "INR",
  } = data;

  const currencySymbol = currency === "INR" ? "₹" : currency;

  return (
    <EmailLayout previewText={`Booking Confirmed — ${eventTitle}`}>
      <EmailHeader />

      {/* Main Card */}
      <Section style={cardStyle}>
        {/* Status Badge */}
        <Section style={badgeContainer}>
          <Text style={badgeStyle}>✓ BOOKING CONFIRMED</Text>
        </Section>

        {/* Event Header */}
        <Heading style={eventTitleStyle}>{eventTitle}</Heading>
        <Text style={eventDateStyle}>{eventDate}</Text>

        {/* Greeting */}
        <Text style={greetingStyle}>
          Hi <strong style={whiteText}>{customerName}</strong>,
          <br />
          your booking is confirmed. Here is your summary.
        </Text>

        {/* Booking Reference */}
        <Section style={referenceCardStyle}>
          <Text style={referenceLabelStyle}>Booking Reference</Text>
          <Text style={referenceValueStyle}>{bookingReference}</Text>
        </Section>

        {/* Ticket Breakdown Header */}
        <Section style={tableHeaderStyle}>
          <Row>
            <Column style={colLeftHeaderStyle}>Ticket</Column>
            <Column style={colCenterHeaderStyle}>Qty</Column>
            <Column style={colRightHeaderStyle}>Amount</Column>
          </Row>
        </Section>

        {/* Ticket Breakdown Rows */}
        {tickets.map((t, idx) => (
          <Section key={idx} style={tableRowStyle}>
            <Row>
              <Column style={colLeftStyle}>{t.tierName}</Column>
              <Column style={colCenterStyle}>{t.quantity}</Column>
              <Column style={colRightStyle}>
                {currencySymbol}
                {(t.price * t.quantity).toLocaleString("en-IN")}
              </Column>
            </Row>
          </Section>
        ))}

        {/* Total */}
        <Section style={totalContainerStyle}>
          <Row>
            <Column style={totalLabelStyle}>Total Paid</Column>
            <Column style={totalValueStyle}>
              {currencySymbol}
              {totalAmount.toLocaleString("en-IN")}
            </Column>
          </Row>
        </Section>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

// Helper to render the email to HTML string
export async function bookingConfirmationHtml(
  data: BookingConfirmationData,
): Promise<string> {
  return renderTemplate(<BookingConfirmationEmail data={data} />);
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
  background: "rgba(22, 163, 74, 0.13)",
  color: "#4ade80",
  border: "1px solid rgba(22, 163, 74, 0.33)",
  borderRadius: "999px",
  padding: "6px 20px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.5px",
  margin: "0 auto",
};

const eventTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  textAlign: "center" as const,
  lineHeight: "1.3",
  fontFamily: "Outfit, sans-serif",
};

const eventDateStyle: React.CSSProperties = {
  margin: "0 0 28px",
  fontSize: "14px",
  color: "#888888",
  textAlign: "center" as const,
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

const referenceCardStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const referenceLabelStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  color: "#666666",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const referenceValueStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "20px",
  fontWeight: 700,
  color: "#a78bfa",
  fontFamily: "monospace",
  letterSpacing: "2px",
};

const tableHeaderStyle: React.CSSProperties = {
  marginBottom: "8px",
  borderBottom: "1px solid #2a2a2a",
  paddingBottom: "8px",
};

const colLeftHeaderStyle: React.CSSProperties = {
  textAlign: "left" as const,
  fontSize: "11px",
  color: "#555555",
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
  width: "50%",
};

const colCenterHeaderStyle: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: "11px",
  color: "#555555",
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
  width: "20%",
};

const colRightHeaderStyle: React.CSSProperties = {
  textAlign: "right" as const,
  fontSize: "11px",
  color: "#555555",
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
  width: "30%",
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: "1px solid #2a2a2a",
  paddingBottom: "10px",
  paddingTop: "10px",
};

const colLeftStyle: React.CSSProperties = {
  textAlign: "left" as const,
  fontSize: "14px",
  color: "#c0c0c0",
  width: "50%",
};

const colCenterStyle: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: "14px",
  color: "#c0c0c0",
  width: "20%",
};

const colRightStyle: React.CSSProperties = {
  textAlign: "right" as const,
  fontSize: "14px",
  color: "#e0e0e0",
  width: "30%",
};

const totalContainerStyle: React.CSSProperties = {
  marginTop: "16px",
  paddingTop: "16px",
  borderTop: "1px solid #2a2a2a",
};

const totalLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#888888",
  fontWeight: 600,
  textAlign: "left" as const,
  width: "50%",
};

const totalValueStyle: React.CSSProperties = {
  fontSize: "20px",
  color: "#a78bfa",
  fontWeight: 900,
  textAlign: "right" as const,
  width: "50%",
};
