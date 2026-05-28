import * as React from "react";
import { Section, Text, Heading } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeader } from "./components/EmailHeader";
import { EmailFooter } from "./components/EmailFooter";
import { renderTemplate } from "../render-template";

export interface TicketDeliveryData {
  customerName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  bookingReference: string;
}

interface TicketDeliveryEmailProps {
  data: TicketDeliveryData;
}

export default function TicketDeliveryEmail({
  data,
}: TicketDeliveryEmailProps) {
  const { customerName, eventTitle, eventDate, venue, bookingReference } = data;

  return (
    <EmailLayout previewText={`Your Tickets — ${eventTitle}`}>
      <EmailHeader />

      {/* Main Card */}
      <Section style={cardStyle}>
        {/* Status Badge */}
        <Section style={badgeContainer}>
          <Text style={badgeStyle}>🎟 YOUR TICKETS</Text>
        </Section>

        {/* Event Header */}
        <Heading style={eventTitleStyle}>{eventTitle}</Heading>
        <Text style={eventDateStyle}>{eventDate}</Text>

        {/* Greeting */}
        <Text style={greetingStyle}>
          Hi <strong style={whiteText}>{customerName}</strong>,
          <br />
          your tickets are ready. Show this at the door.
        </Text>

        {/* Venue Info */}
        <Section style={infoBlockStyle}>
          <Text style={labelStyle}>Venue</Text>
          <Text style={valueStyle}>📍 {venue}</Text>
        </Section>

        {/* Booking Reference */}
        <Section style={referenceCardStyle}>
          <Text style={referenceLabelStyle}>Booking Reference</Text>
          <Text style={referenceValueStyle}>{bookingReference}</Text>
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
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

// Helper to render the email to HTML string
export async function ticketDeliveryHtml(
  data: TicketDeliveryData,
): Promise<string> {
  return renderTemplate(<TicketDeliveryEmail data={data} />);
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
  background: "rgba(124, 58, 237, 0.13)",
  color: "#a78bfa",
  border: "1px solid rgba(124, 58, 237, 0.33)",
  borderRadius: "999px",
  padding: "6px 20px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.5px",
  margin: "0 auto",
};

const eventTitleStyle: React.CSSProperties = {
  margin: "0 0 6px",
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

const infoBlockStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "24px",
};

const labelStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  color: "#555555",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const valueStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "15px",
  fontWeight: 600,
  color: "#e0e0e0",
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
