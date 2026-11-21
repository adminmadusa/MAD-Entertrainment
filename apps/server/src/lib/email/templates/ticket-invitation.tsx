import { Link, Section, Text } from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

export interface TicketInvitationData {
  recipientName?: string;
  inviterName?: string;
  eventTitle: string;
  eventDate?: string;
  venueName?: string;
  claimUrl: string;
  tierName?: string;
}

const previewData: TicketInvitationData = {
  recipientName: "Alex Smith",
  inviterName: "John Doe",
  eventTitle: "MAD Summer Festival 2026",
  eventDate: "August 30, 2026",
  venueName: "MAD Arena, Austin, TX",
  claimUrl: "https://www.madentertainments.net/claim?ticketId=ticket_12345",
  tierName: "VIP Access",
};

interface TicketInvitationEmailProps {
  data?: TicketInvitationData;
}

export default function TicketInvitationEmail({
  data = previewData,
}: TicketInvitationEmailProps) {
  const {
    recipientName,
    inviterName,
    eventTitle,
    eventDate,
    venueName,
    claimUrl,
    tierName,
  } = data;

  return (
    <EmailBase
      previewText={`You've been invited to ${eventTitle}`}
      badgeText="🎟 TICKET INVITATION"
      badgeStyle={{
        background: "rgba(168, 85, 247, 0.13)",
        color: "#c084fc",
        border: "1px solid rgba(168, 85, 247, 0.33)",
      }}
      title="You've Been Invited!"
      subtitle={eventTitle}
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{recipientName || "there"}</strong>,
          <br />
          {inviterName ? (
            <>
              <strong style={emailSharedStyles.whiteText}>{inviterName}</strong> has assigned an event ticket to you.
            </>
          ) : (
            <>An event ticket has been assigned to you.</>
          )}{" "}
          Claim your ticket below to receive your door-entry QR pass.
        </>
      }
    >
      <Section style={emailSharedStyles.detailBox}>
        <Text style={emailSharedStyles.detailLabel}>Event</Text>
        <Text style={emailSharedStyles.eventTitle}>{eventTitle}</Text>

        {tierName && (
          <>
            <Text style={emailSharedStyles.detailLabel}>Ticket Tier</Text>
            <Text style={emailSharedStyles.detailValueText}>{tierName}</Text>
          </>
        )}

        {eventDate && (
          <>
            <Text style={emailSharedStyles.detailLabel}>Date & Time</Text>
            <Text style={emailSharedStyles.detailValueText}>{eventDate}</Text>
          </>
        )}

        {venueName && (
          <>
            <Text style={emailSharedStyles.detailLabel}>Venue</Text>
            <Text style={emailSharedStyles.detailValueText}>📍 {venueName}</Text>
          </>
        )}
      </Section>

      <Text style={buttonContainer}>
        <Link href={claimUrl} style={buttonStyle}>
          Claim My Ticket
        </Link>
      </Text>

      <Text style={subtextStyle}>
        If the button does not work, copy and paste this link into your browser:
        <br />
        <Link href={claimUrl} style={linkStyle}>
          {claimUrl}
        </Link>
      </Text>
    </EmailBase>
  );
}

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0 24px",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "15px",
  textDecoration: "none",
  letterSpacing: "0.5px",
};

const subtextStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "12px",
  color: "#666666",
  textAlign: "center" as const,
  lineHeight: "1.6",
  wordBreak: "break-all" as const,
};

const linkStyle: React.CSSProperties = {
  color: "#a78bfa",
  textDecoration: "underline",
  fontSize: "11px",
};

export async function ticketInvitationHtml(
  data: TicketInvitationData
): Promise<string> {
  return renderTemplate(<TicketInvitationEmail data={data} />);
}
