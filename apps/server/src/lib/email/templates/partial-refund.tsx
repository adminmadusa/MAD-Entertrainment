import * as React from "react";

import { renderTemplate } from "../render-template";
import { RefundEmailBase, sharedStyles } from "./components/RefundEmailBase";

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

  const currencySymbol = currency === "INR" ? "₹" : currency;

  const fields = [
    { label: "Booking Reference", value: bookingReference, valueStyle: sharedStyles.bookingRef },
    {
      label: "Original Order Amount",
      value: `${currencySymbol}${originalAmount.toLocaleString("en-IN")}`,
      valueStyle: sharedStyles.normalValueText,
    },
    {
      label: "Refunded Amount",
      value: `${currencySymbol}${refundAmount.toLocaleString("en-IN")}`,
      valueStyle: sharedStyles.partialRefundAmount,
    },
    {
      label: "Remaining Balance",
      value: `${currencySymbol}${remainingAmount.toLocaleString("en-IN")}`,
      valueStyle: sharedStyles.normalValueText,
    },
  ];

  if (reason) {
    fields.push({
      label: "Reason",
      value: reason,
      valueStyle: sharedStyles.normalValueText,
    });
  }

  return (
    <RefundEmailBase
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
          Hi <strong style={sharedStyles.whiteText}>{customerName}</strong>,
          <br />
          your partial refund has been processed. Here is the refund breakdown.
        </>
      }
      fields={fields}
    />
  );
}

export async function partialRefundHtml(
  data: PartialRefundData,
): Promise<string> {
  return renderTemplate(<PartialRefundEmail data={data} />);
}
