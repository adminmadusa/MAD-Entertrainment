import { formatMoney } from "@mad/shared";
import { Section, Text } from "@react-email/components";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

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

  return (
    <EmailBase
      previewText={`Refund Completed — ${bookingReference}`}
      badgeText="✓ REFUND COMPLETED"
      badgeStyle={{
        background: "rgba(59, 130, 246, 0.13)",
        color: "#60a5fa",
        border: "1px solid rgba(59, 130, 246, 0.33)",
      }}
      title="Refund Successful"
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{customerName}</strong>,
          <br />
          your refund has been processed successfully. Here are the details of the refund.
        </>
      }
    >
      <Section style={emailSharedStyles.detailBox}>
        <Text style={emailSharedStyles.detailLabel}>Booking Reference</Text>
        <Text style={emailSharedStyles.bookingRef}>{bookingReference}</Text>

        <Text style={emailSharedStyles.detailLabel}>Event Name</Text>
        <Text style={emailSharedStyles.eventTitle}>{eventTitle}</Text>

        <Text style={emailSharedStyles.detailLabel}>Refunded Amount</Text>
        <Text style={emailSharedStyles.fullRefundAmount}>
          {formatMoney(refundAmount, currency)}
        </Text>

        <Text style={emailSharedStyles.detailLabel}>Refund Date</Text>
        <Text style={emailSharedStyles.detailValueText}>{refundDate}</Text>

        <Text style={emailSharedStyles.detailLabel}>Settlement Timeline</Text>
        <Text style={emailSharedStyles.detailValueText}>{settlementTimeline}</Text>
      </Section>
    </EmailBase>
  );
}

export async function fullRefundHtml(data: FullRefundData): Promise<string> {
  return renderTemplate(<FullRefundEmail data={data} />);
}
