import { Section, Text, Row, Column } from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

export interface BookingConfirmationData {
  customerName: string;
  eventTitle: string;
  bookingReference: string;
  eventDate: string;
  tickets?: { tierName: string; quantity: number; price: number }[];
  totalAmount?: number;
  currency?: string;
  ticketUrl?: string;
  manageTicketsUrl?: string;
  hasPdfAttachment?: boolean;
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
  ticketUrl: "https://www.madentertainments.net/tickets?ref=MAD-2026-12345",
  manageTicketsUrl: "https://www.madentertainments.net/tickets",
  hasPdfAttachment: true,
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
    tickets = [],
    totalAmount,
    currency = "INR",
    ticketUrl,
    manageTicketsUrl,
    hasPdfAttachment,
  } = data;

  const currencySymbol = currency === "INR" ? "₹" : currency;

  return (
    <EmailBase
      previewText={`Booking Confirmed — ${eventTitle}`}
      badgeText="✓ BOOKING CONFIRMED"
      badgeStyle={{
        background: "rgba(22, 163, 74, 0.13)",
        color: "#4ade80",
        border: "1px solid rgba(22, 163, 74, 0.33)",
      }}
      title={eventTitle}
      subtitle={eventDate}
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{customerName}</strong>,
          <br />
          your booking is confirmed.
          {hasPdfAttachment && (
            <>
              <br />
              Please find your ticket attached as a PDF document. You can present the QR code at the gate for entry.
            </>
          )}
        </>
      }
    >
      {/* Booking Reference */}
      <Section style={emailSharedStyles.referenceCard}>
        <Text style={emailSharedStyles.detailLabel}>Booking Reference</Text>
        <Text style={emailSharedStyles.referenceValue}>{bookingReference}</Text>
      </Section>

      {/* Ticket Breakdown Header */}
      {tickets.length > 0 && (
        <>
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
                  {`${currencySymbol}${(t.price * t.quantity).toLocaleString("en-IN")}`}
                </Column>
              </Row>
            </Section>
          ))}
        </>
      )}

      {/* Total */}
      {totalAmount !== undefined && (
        <Section style={totalContainerStyle}>
          <Row>
            <Column style={totalLabelStyle}>Total Paid</Column>
            <Column style={totalValueStyle}>
              {`${currencySymbol}${totalAmount.toLocaleString("en-IN")}`}
            </Column>
          </Row>
        </Section>
      )}

      {/* Action Buttons */}
      {(ticketUrl || manageTicketsUrl) && (
        <Section style={ctaSectionStyle}>
          {ticketUrl && (
            <a href={ticketUrl} style={primaryCtaButtonStyle}>
              View Ticket Online
            </a>
          )}
          {manageTicketsUrl && (
            <div>
              <a href={manageTicketsUrl} style={secondaryCtaLinkStyle}>
                Manage My Tickets
              </a>
            </div>
          )}
        </Section>
      )}

      {/* Fallback Copy-Paste Link */}
      {ticketUrl && (
        <Section style={fallbackLinkContainerStyle}>
          <Text style={fallbackLabelStyle}>
            If the buttons don&apos;t work, copy and paste this link:
          </Text>
          <a href={ticketUrl} style={fallbackLinkStyle}>
            {ticketUrl}
          </a>
        </Section>
      )}
    </EmailBase>
  );
}

// Helper to render the email to HTML string
export async function bookingConfirmationHtml(
  data: BookingConfirmationData,
): Promise<string> {
  return renderTemplate(<BookingConfirmationEmail data={data} />);
}

// Inline Styles specific to Booking Confirmation
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
};

const ctaSectionStyle: React.CSSProperties = {
  margin: "28px 0 16px",
  textAlign: "center" as const,
};

const primaryCtaButtonStyle: React.CSSProperties = {
  backgroundColor: "#8B5CF6",
  color: "#ffffff",
  padding: "13px 28px",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: 700,
  fontSize: "14px",
  display: "inline-block",
  boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
  letterSpacing: "0.3px",
};

const secondaryCtaLinkStyle: React.CSSProperties = {
  color: "#a78bfa",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 600,
  display: "inline-block",
  marginTop: "12px",
};

const fallbackLinkContainerStyle: React.CSSProperties = {
  margin: "20px 0",
  padding: "14px 16px",
  backgroundColor: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  textAlign: "center" as const,
};

const fallbackLabelStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "11px",
  color: "#777777",
};

const fallbackLinkStyle: React.CSSProperties = {
  color: "#a78bfa",
  fontSize: "11px",
  wordBreak: "break-all" as const,
  fontFamily: "monospace",
};
