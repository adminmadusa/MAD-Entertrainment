import * as React from "react";
import { Section, Text, Heading } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeader } from "./components/EmailHeader";
import { EmailFooter } from "./components/EmailFooter";
import { renderTemplate } from "../render-template";

export interface EventCancellationData {
  customerName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  bookingReference: string;
}

const previewData: EventCancellationData = {
  customerName: "John Doe",
  eventTitle: "MAD Summer Festival",
  eventDate: "August 12, 2026",
  venueName: "MAD Arena, Mumbai",
  bookingReference: "MAD-2026-12345",
};

interface EventCancellationEmailProps {
  data?: EventCancellationData;
}

export default function EventCancellationEmail({
  data = previewData,
}: EventCancellationEmailProps) {
  const { customerName, eventTitle, eventDate, venueName, bookingReference } = data;

  return (
    <EmailLayout previewText={`Event Cancelled — ${eventTitle}`}>
      <EmailHeader />

      <Section style={cardStyle}>
        <Section style={badgeContainer}>
          <Text style={badgeStyle}>✕ EVENT CANCELLED</Text>
        </Section>

        <Heading style={titleStyle}>Event Cancellation Notice</Heading>

        <Text style={greetingStyle}>
          Hi <strong style={whiteText}>{customerName}</strong>,
          <br />
          we regret to inform you that the event <strong style={whiteText}>"{eventTitle}"</strong> has been cancelled.
        </Text>

        <Section style={detailBoxStyle}>
          <Text style={detailLabelStyle}>Cancelled Event</Text>
          <Text style={eventTitleStyle}>{eventTitle}</Text>

          <Text style={detailLabelStyle}>Original Date</Text>
          <Text style={detailValueText}>{eventDate}</Text>

          <Text style={detailLabelStyle}>Venue</Text>
          <Text style={detailValueText}>{venueName}</Text>

          <Text style={detailLabelStyle}>Booking Reference</Text>
          <Text style={detailValueStyle}>{bookingReference}</Text>
        </Section>

        <Text style={textStyle}>
          A full refund has been initiated to your original payment method. The refunded amount should reflect in your account within 5-7 business days depending on your bank's processing cycles.
        </Text>

        <Text style={textStyle}>
          If you have any immediate questions or concerns, please feel free to reach out to our support team.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

export async function eventCancellationHtml(
  data: EventCancellationData,
): Promise<string> {
  return renderTemplate(<EventCancellationEmail data={data} />);
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
  marginBottom: "24px",
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

const detailValueText: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "14px",
  color: "#e0e0e0",
};

const textStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  color: "#a0a0a0",
  lineHeight: "1.5",
};
