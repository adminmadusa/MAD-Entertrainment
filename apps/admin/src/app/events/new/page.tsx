"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { EventForm } from "@/components/forms/EventForm";
import { adminGetCategories } from "@/lib/api/admin/category.service";
import { adminCreateEvent } from "@/lib/api/admin/event.service";
import { adminGetTicketProfiles } from "@/lib/api/admin/ticket-profile.service";
import { adminGetTiers } from "@/lib/api/admin/tier.service";
import { extractApiError } from "@/lib/api/client";
import { EventMutationPayload } from "@/types/event-form";

export default function CreateEventPage() {
  const router = useRouter();

  const { data: categories = [] } = useQuery({
    queryKey: ["adminCategories"],
    queryFn: adminGetCategories,
  });
  const { data: tiers = [] } = useQuery({
    queryKey: ["adminTiers"],
    queryFn: adminGetTiers,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["adminTicketProfiles"],
    queryFn: adminGetTicketProfiles,
  });

  const createMutation = useMutation({
    mutationFn: (payload: EventMutationPayload) => adminCreateEvent(payload),
    onSuccess: () => router.push("/events"),
  });

  return (
    <EventForm
      mode="create"
      categories={categories}
      tiers={tiers}
      profiles={profiles}
      isSubmitting={createMutation.isPending}
      serverError={
        createMutation.error
          ? extractApiError(createMutation.error).message
          : ""
      }
      onSubmitPayload={async (payload) => {
        await createMutation.mutateAsync(payload);
      }}
      onBack={() => router.back()}
    />
  );
}
