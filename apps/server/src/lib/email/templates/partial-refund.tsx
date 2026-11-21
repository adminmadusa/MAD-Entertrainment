import { formatMoney } from "@mad/shared";
import { Section, Text } from "@react-email/components";

import { renderTemplate } from "../render-template";
import { EmailBase, emailSharedStyles } from "./components/EmailBase";

export interface PartialRefundData {
  customerName: string;
  bookingReference: string;
  originalAmount: number;
  refundAmount: number;
  remainingAmount: number;
  reason?: string;
  currency?: string;
}

const previewData: PartialRefundData = {
  customerName: "John Doe",
  bookingReference: "MAD-2026-12345",
  originalAmount: 2999,
  refundAmount: 1000,
  remainingAmount: 1999,
  reason: "Tier adjustment refund",
  currency: "INR",
};

interface PartialRefundEmailProps {
  data?: PartialRefundData;
}

export default function PartialRefundEmail({
  data = previewData,
}: PartialRefundEmailProps) {
  const {
    customerName,
    bookingReference,
    originalAmount,
    refundAmount,
    remainingAmount,
    reason,
    currency = "INR",
  } = data;

  return (
    <EmailBase
      previewText={`Partial Refund Completed — ${bookingReference}`}
      badgeText="✓ PARTIAL REFUND COMPLETED"
      badgeStyle={{
        background: "rgba(245, 158, 11, 0.13)",
        color: "#f59e0b",
        border: "1px solid rgba(245, 158, 11, 0.33)",
      }}
      title="Partial Refund Successful"
      description={
        <>
          Hi <strong style={emailSharedStyles.whiteText}>{customerName}</strong>,
          <br />
          your partial refund has been processed. Here is the refund breakdown.
        </>
      }
    >
      <Section style={emailSharedStyles.detailBox}>
        <Text style={emailSharedStyles.detailLabel}>Booking Reference</Text>
        <Text style={emailSharedStyles.bookingRef}>{bookingReference}</Text>

        <Text style={emailSharedStyles.detailLabel}>Original Order Amount</Text>
        <Text style={emailSharedStyles.detailValueText}>
          {formatMoney(originalAmount, currency)}
        </Text>

        <Text style={emailSharedStyles.detailLabel}>Refunded Amount</Text>
        <Text style={emailSharedStyles.partialRefundAmount}>
          {formatMoney(refundAmount, currency)}
        </Text>

        <Text style={emailSharedStyles.detailLabel}>Remaining Balance</Text>
        <Text style={emailSharedStyles.detailValueText}>
          {formatMoney(remainingAmount, currency)}
        </Text>

        {reason && (
          <>
            <Text style={emailSharedStyles.detailLabel}>Reason</Text>
            <Text style={emailSharedStyles.detailValueText}>{reason}</Text>
          </>
        )}
      </Section>
    </EmailBase>
  );
}

export async function partialRefundHtml(
  data: PartialRefundData,
): Promise<string> {
  return renderTemplate(<PartialRefundEmail data={data} />);
}
