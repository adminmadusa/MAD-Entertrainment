"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { PopupForm } from "@/components/forms/PopupForm";
import { useFormMutation } from "@/hooks/forms/core";
import { adminGetPopup, adminUpdatePopup } from "@/lib/api/admin/popup.service";
import { PopupMutationPayload } from "@/types/popup-form";

export default function EditPopupPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const { data: popup, isLoading } = useQuery({
    queryKey: ["admin-popup", id],
    queryFn: () => adminGetPopup(id),
    enabled: !!id,
  });

  const updateMutation = useFormMutation<
    PopupMutationPayload,
    Awaited<ReturnType<typeof adminUpdatePopup>>
  >({
    mutationFn: (payload) => adminUpdatePopup(id, payload),
    redirectTo: "/popups",
  });

  if (isLoading || !popup) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">
          Loading campaign details...
        </div>
      </div>
    );
  }

  return (
    <PopupForm
      mode="edit"
      initialPopup={popup}
      isSubmitting={updateMutation.isPending}
      serverError={updateMutation.serverError}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await updateMutation.submit(payload);
      }}
    />
  );
}
