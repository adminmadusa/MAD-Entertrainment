"use client";

import { useRouter } from "next/navigation";

import { PopupForm } from "@/components/forms/PopupForm";
import { useFormMutation } from "@/hooks/forms/core";
import { adminCreatePopup } from "@/lib/api/admin/popup.service";
import { PopupMutationPayload } from "@/types/popup-form";

export default function CreatePopupPage() {
  const router = useRouter();

  const createMutation = useFormMutation<
    PopupMutationPayload,
    Awaited<ReturnType<typeof adminCreatePopup>>
  >({
    mutationFn: (payload) => adminCreatePopup(payload),
    redirectTo: "/popups",
  });

  return (
    <PopupForm
      mode="create"
      isSubmitting={createMutation.isPending}
      serverError={createMutation.serverError}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await createMutation.submit(payload);
      }}
    />
  );
}
