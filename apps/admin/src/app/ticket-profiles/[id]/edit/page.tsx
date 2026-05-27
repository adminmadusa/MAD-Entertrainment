"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { TicketProfileForm } from "@/components/forms/TicketProfileForm";
import {
  adminGetTicketProfile,
  adminUpdateTicketProfile,
} from "@/lib/api/admin/ticket-profile.service";
import { adminGetTiers } from "@/lib/api/admin/tier.service";
import { extractApiError } from "@/lib/api/client";
import { TicketProfileMutationPayload } from "@/types/ticket-profile-form";

export default function EditTicketProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: dbTiers = [] } = useQuery({
    queryKey: ["adminTiers"],
    queryFn: adminGetTiers,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-ticket-profile", id],
    queryFn: () => adminGetTicketProfile(id),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: TicketProfileMutationPayload) =>
      adminUpdateTicketProfile(id, payload),
    onSuccess: () => router.push("/ticket-profiles"),
  });

  if (isLoading || !profile) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-purple" />
      </div>
    );
  }

  return (
    <TicketProfileForm
      mode="edit"
      initialProfile={profile}
      tiers={dbTiers}
      isSubmitting={updateMutation.isPending}
      serverError={
        updateMutation.error
          ? extractApiError(updateMutation.error).message
          : ""
      }
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await updateMutation.mutateAsync(payload);
      }}
    />
  );
}
