import { formatMoney } from "@mad/shared";
import { Section, Text, Row, Column } from "@react-email/components";

import { renderTemplate } from "../render-template";
import * as styles from "./booking-confirmation.styles";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

export interface BookingConfirmationData {
  customerName: string;
  customerEmail?: string;
  eventTitle: string;
  bookingReference: string;
  eventDate: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  tickets?: { tierName: string; quantity: number; price: number }[];
  subtotal?: number;
  convenienceFee?: number;
  taxLabel?: string;
  taxPercentage?: number;
  taxAmount?: number;
  discount?: number;
  couponCode?: string;
  totalAmount: number;
  currency?: string;
  paymentGateway?: string;
  paymentTransactionId?: string;
  paidAt?: string;
  ticketUrl?: string;
  manageTicketsUrl?: string;
  hasPdfAttachment?: boolean;
}

const previewData: BookingConfirmationData = {
  customerName: "John Doe",
  eventTitle: "MAD Summer Festival",
  bookingReference: "MAD-2026-12345",
  eventDate: "August 12, 2026",
  eventTime: "07:00 PM IST",
  venueName: "MAD Arena",
  venueAddress: "123 Entertainment Blvd, Austin, TX",
  tickets: [
    { tierName: "General Admission", quantity: 2, price: 999 },
    { tierName: "VIP", quantity: 1, price: 1999 },
  ],
  subtotal: 3997,
  convenienceFee: 50,
  taxLabel: "GST",
  taxPercentage: 18,
  taxAmount: 720,
  discount: 100,
  couponCode: "SUMMER100",
  totalAmount: 4667,
  currency: "INR",
  paymentGateway: "Razorpay",
  paymentTransactionId: "pay_123456789",
  paidAt: "Aug 12, 2026, 05:30 PM",
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
    eventTime,
    venueName,
    venueAddress,
    tickets = [],
    subtotal,
    convenienceFee,
    taxLabel,
    taxPercentage,
    taxAmount,
    discount,
    couponCode,
    totalAmount,
    currency = "USD",
    paymentGateway,
    paymentTransactionId,
    paidAt,
    ticketUrl,
    manageTicketsUrl,
    hasPdfAttachment,
  } = data;

  const resolvedTaxLabel = taxLabel || "Sales Tax";
  const taxPercentText =
    taxPercentage !== undefined && taxPercentage > 0 ? ` (${taxPercentage}%)` : "";

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
      subtitle={eventTime ? `${eventDate} • ${eventTime}` : eventDate}
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
      {/* Booking Reference Card */}
      <Section style={emailSharedStyles.referenceCard}>
        <Text style={emailSharedStyles.detailLabel}>Booking Reference</Text>
        <Text style={emailSharedStyles.referenceValue}>{bookingReference}</Text>
      </Section>

      {/* Venue & Event Details Box */}
      {(venueName || venueAddress) && (
        <Section style={styles.venueBoxStyle}>
          <Text style={emailSharedStyles.detailLabel}>Venue & Location</Text>
          {venueName && <Text style={styles.venueNameStyle}>{venueName}</Text>}
          {venueAddress && <Text style={styles.venueAddressStyle}>{venueAddress}</Text>}
        </Section>
      )}

      {/* Ticket Breakdown Header */}
      {tickets.length > 0 && (
        <Section style={styles.orderContainerStyle}>
          <Text style={styles.sectionTitleStyle}>Order Summary</Text>
          <Section style={styles.tableHeaderStyle}>
            <Row>
              <Column style={styles.colLeftHeaderStyle}>Ticket</Column>
              <Column style={styles.colCenterHeaderStyle}>Qty</Column>
              <Column style={styles.colRightHeaderStyle}>Price</Column>
            </Row>
          </Section>

          {/* Ticket Breakdown Rows */}
          {tickets.map((t, idx) => (
            <Section key={idx} style={styles.tableRowStyle}>
              <Row>
                <Column style={styles.colLeftStyle}>{t.tierName}</Column>
                <Column style={styles.colCenterStyle}>{t.quantity}</Column>
                <Column style={styles.colRightStyle}>
                  {formatMoney(t.price * t.quantity, currency)}
                </Column>
              </Row>
            </Section>
          ))}

          {/* Financial Breakdown Ledger */}
          <Section style={styles.ledgerContainerStyle}>
            {subtotal !== undefined && (
              <Row style={styles.ledgerRowStyle}>
                <Column style={styles.ledgerLabelStyle}>Subtotal</Column>
                <Column style={styles.ledgerValueStyle}>{formatMoney(subtotal, currency)}</Column>
              </Row>
            )}

            {convenienceFee !== undefined && convenienceFee > 0 && (
              <Row style={styles.ledgerRowStyle}>
                <Column style={styles.ledgerLabelStyle}>Convenience Fee</Column>
                <Column style={styles.ledgerValueStyle}>{formatMoney(convenienceFee, currency)}</Column>
              </Row>
            )}

            {taxAmount !== undefined && taxAmount > 0 && (
              <Row style={styles.ledgerRowStyle}>
                <Column style={styles.ledgerLabelStyle}>
                  {`${resolvedTaxLabel}${taxPercentText}`}
                </Column>
                <Column style={styles.ledgerValueStyle}>{formatMoney(taxAmount, currency)}</Column>
              </Row>
            )}

            {discount !== undefined && discount > 0 && (
              <Row style={styles.ledgerRowStyle}>
                <Column style={styles.discountLabelStyle}>
                  Discount {couponCode ? `(${couponCode})` : ""}
                </Column>
                <Column style={styles.discountValueStyle}>-{formatMoney(discount, currency)}</Column>
              </Row>
            )}

            {/* Total Paid Row */}
            <Row style={styles.totalRowStyle}>
              <Column style={styles.totalLabelStyle}>Total Paid</Column>
              <Column style={styles.totalValueStyle}>{formatMoney(totalAmount, currency)}</Column>
            </Row>
          </Section>
        </Section>
      )}

      {/* Payment Details Card */}
      {(paymentGateway || paymentTransactionId) && (
        <Section style={styles.paymentCardStyle}>
          <Text style={emailSharedStyles.detailLabel}>Payment Information</Text>
          <Row style={styles.paymentRowStyle}>
            <Column style={styles.paymentColStyle}>
              <Text style={styles.paymentFieldLabelStyle}>Status</Text>
              <Text style={styles.paymentStatusPillStyle}>PAID</Text>
            </Column>
            {paymentGateway && (
              <Column style={styles.paymentColStyle}>
                <Text style={styles.paymentFieldLabelStyle}>Method</Text>
                <Text style={styles.paymentFieldValueStyle}>{paymentGateway.toUpperCase()}</Text>
              </Column>
            )}
          </Row>
          {paymentTransactionId && (
            <Row style={styles.paymentRowStyle}>
              <Column style={styles.paymentColStyle}>
                <Text style={styles.paymentFieldLabelStyle}>Transaction ID</Text>
                <Text style={styles.paymentRefValueStyle}>{paymentTransactionId}</Text>
              </Column>
              {paidAt && (
                <Column style={styles.paymentColStyle}>
                  <Text style={styles.paymentFieldLabelStyle}>Paid At</Text>
                  <Text style={styles.paymentFieldValueStyle}>{paidAt}</Text>
                </Column>
              )}
            </Row>
          )}
        </Section>
      )}

      {/* Action Buttons */}
      {(ticketUrl || manageTicketsUrl) && (
        <Section style={styles.ctaSectionStyle}>
          {ticketUrl && (
            <a href={ticketUrl} style={styles.primaryCtaButtonStyle}>
              View Ticket Online
            </a>
          )}
          {manageTicketsUrl && (
            <div>
              <a href={manageTicketsUrl} style={styles.secondaryCtaLinkStyle}>
                Manage My Tickets
              </a>
            </div>
          )}
        </Section>
      )}

      {/* Fallback Copy-Paste Link */}
      {ticketUrl && (
        <Section style={styles.fallbackLinkContainerStyle}>
          <Text style={styles.fallbackLabelStyle}>
            If the buttons don&apos;t work, copy and paste this link:
          </Text>
          <a href={ticketUrl} style={styles.fallbackLinkStyle}>
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
