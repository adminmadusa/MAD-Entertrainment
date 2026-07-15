import { Section, Text } from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

export interface TicketDeliveryData {
  customerName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  bookingReference: string;
}

const previewData: TicketDeliveryData = {
  customerName: "John Doe",
  eventTitle: "MAD Summer Festival",
  eventDate: "August 12, 2026",
  venue: "MAD Arena",
  bookingReference: "MAD-2026-12345",
};

interface TicketDeliveryEmailProps {
  data?: TicketDeliveryData;
}

export default function TicketDeliveryEmail({
  data = previewData,
}: TicketDeliveryEmailProps) {
  const { customerName, eventTitle, eventDate, venue, bookingReference } = data;

  return (
    <EmailBase
      previewText={`Your Tickets — ${eventTitle}`}
      badgeText="🎟 YOUR TICKETS"
      badgeStyle={{
        background: "rgba(124, 58, 237, 0.13)",
        color: "#a78bfa",
        border: "1px solid rgba(124, 58, 237, 0.33)",
      }}
      title={eventTitle}
      subtitle={eventDate}
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{customerName}</strong>,
          <br />
          your tickets are ready. Show this at the door.
        </>
      }
    >
      {/* Venue Info */}
      <Section style={emailSharedStyles.infoBlock}>
        <Text style={emailSharedStyles.detailLabel}>Venue</Text>
        <Text style={venueValueStyle}>📍 {venue}</Text>
      </Section>

      {/* Booking Reference */}
      <Section style={emailSharedStyles.referenceCard}>
        <Text style={emailSharedStyles.detailLabel}>Booking Reference</Text>
        <Text style={emailSharedStyles.referenceValue}>{bookingReference}</Text>
      </Section>

      {/* QR Placeholder */}
      <Section style={qrPlaceholderStyle}>
        <Text style={qrIconStyle}>🔲</Text>
        <Text style={qrTextStyle}>
          QR ticket will appear here once ticket delivery is activated.
        </Text>
        <Text style={qrSubTextStyle}>
          Show your booking reference at the venue in the meantime.
        </Text>
      </Section>
    </EmailBase>
  );
}

// Helper to render the email to HTML string
export async function ticketDeliveryHtml(
  data: TicketDeliveryData,
): Promise<string> {
  return renderTemplate(<TicketDeliveryEmail data={data} />);
}

// Inline Styles specific to Ticket Delivery
const venueValueStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "15px",
  fontWeight: 600,
  color: "#e0e0e0",
};

const qrPlaceholderStyle: React.CSSProperties = {
  border: "2px dashed #2a2a2a",
  borderRadius: "12px",
  padding: "32px",
  textAlign: "center" as const,
  marginBottom: "8px",
};

const qrIconStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "32px",
};

const qrTextStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "13px",
  color: "#555555",
  fontWeight: 500,
};

const qrSubTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "12px",
  color: "#444444",
};
