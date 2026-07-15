import { Section, Text } from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

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
    <EmailBase
      previewText={`Event Cancelled — ${eventTitle}`}
      badgeText="✕ EVENT CANCELLED"
      badgeStyle={{
        background: "rgba(239, 68, 68, 0.13)",
        color: "#f87171",
        border: "1px solid rgba(239, 68, 68, 0.33)",
      }}
      title="Event Cancellation Notice"
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{customerName}</strong>,
          <br />
          we regret to inform you that the event <strong style={emailSharedStyles.whiteText}>"{eventTitle}"</strong> has been cancelled.
        </>
      }
    >
      <Section style={emailSharedStyles.detailBox}>
        <Text style={emailSharedStyles.detailLabel}>Cancelled Event</Text>
        <Text style={emailSharedStyles.eventTitle}>{eventTitle}</Text>

        <Text style={emailSharedStyles.detailLabel}>Original Date</Text>
        <Text style={emailSharedStyles.detailValueText}>{eventDate}</Text>

        <Text style={emailSharedStyles.detailLabel}>Venue</Text>
        <Text style={emailSharedStyles.detailValueText}>{venueName}</Text>

        <Text style={emailSharedStyles.detailLabel}>Booking Reference</Text>
        <Text style={emailSharedStyles.bookingRef}>{bookingReference}</Text>
      </Section>

      <Text style={emailSharedStyles.bodyText}>
        A full refund has been initiated to your original payment method. The refunded amount should reflect in your account within 5-7 business days depending on your bank's processing cycles.
      </Text>

      <Text style={emailSharedStyles.bodyText}>
        If you have any immediate questions or concerns, please feel free to reach out to our support team.
      </Text>
    </EmailBase>
  );
}

export async function eventCancellationHtml(
  data: EventCancellationData,
): Promise<string> {
  return renderTemplate(<EventCancellationEmail data={data} />);
}
