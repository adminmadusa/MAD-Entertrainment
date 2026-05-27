"use client";

import { useParams, useRouter } from "next/navigation";
import { CheckoutContent } from "@/components/booking/CheckoutContent";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  return (
    <CheckoutContent
      bookingId={bookingId}
      isModal={false}
      onBack={() => {
        router.back();
      }}
      onClose={() => {
        router.push("/events");
      }}
    />
  );
}
