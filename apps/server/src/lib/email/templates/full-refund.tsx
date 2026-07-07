import * as React from "react";

import { renderTemplate } from "../render-template";
import { RefundEmailBase, sharedStyles } from "./components/RefundEmailBase";

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

  const currencySymbol = currency === "INR" ? "₹" : currency;

  return (
    <RefundEmailBase
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
          Hi <strong style={sharedStyles.whiteText}>{customerName}</strong>,
          <br />
          your refund has been processed successfully. Here are the details of the refund.
        </>
      }
      fields={[
        { label: "Booking Reference", value: bookingReference, valueStyle: sharedStyles.bookingRef },
        { label: "Event Name", value: eventTitle, valueStyle: sharedStyles.eventTitle },
        {
          label: "Refunded Amount",
          value: `${currencySymbol}${refundAmount.toLocaleString("en-IN")}`,
          valueStyle: sharedStyles.fullRefundAmount,
        },
        { label: "Refund Date", value: refundDate, valueStyle: sharedStyles.normalValueText },
        { label: "Settlement Timeline", value: settlementTimeline, valueStyle: sharedStyles.normalValueText },
      ]}
    />
  );
}

export async function fullRefundHtml(data: FullRefundData): Promise<string> {
  return renderTemplate(<FullRefundEmail data={data} />);
}
