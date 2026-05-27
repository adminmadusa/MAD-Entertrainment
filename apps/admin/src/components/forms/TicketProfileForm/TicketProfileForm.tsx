"use client";

import { FormActions } from "@/components/forms/primitives";
import { useTicketProfileForm } from "@/hooks/forms/use-ticket-profile-form";
import { AdminTier } from "@/lib/api/admin/tier.service";
import { TicketProfile } from "@mad/types";
import { TicketProfileFormMode } from "@/types/ticket-profile-form";
import { TicketProfileDetailsSection } from "./TicketProfileDetailsSection";
import { TicketProfileGroupsSection } from "./TicketProfileGroupsSection";

interface TicketProfileFormProps {
  mode: TicketProfileFormMode;
  initialProfile?: TicketProfile;
  tiers: AdminTier[];
  isSubmitting: boolean;
  serverError: string;
  onBack: () => void;
  onSubmitPayload: Parameters<
    typeof useTicketProfileForm
  >[0]["onSubmitPayload"];
}

export function TicketProfileForm({
  mode,
  initialProfile,
  tiers,
  isSubmitting,
  serverError,
  onBack,
  onSubmitPayload,
}: TicketProfileFormProps) {
  const {
    values,
    error,
    setField,
    addGroup,
    removeGroup,
    updateGroupField,
    addTicket,
    removeTicket,
    updateTicketField,
    submit,
  } = useTicketProfileForm({ mode, initialProfile, onSubmitPayload });

  let submitLabel =
    mode === "create" ? "Create Ticket Profile" : "Save Changes";
  if (isSubmitting)
    submitLabel = mode === "create" ? "Creating..." : "Saving...";

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">
            {mode === "create"
              ? "Create Ticket Profile"
              : "Edit Ticket Profile"}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === "create"
              ? "Define reusable event ticket templates"
              : "Modify centralized event ticket template"}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5 self-start"
        >
          ← Back
        </button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submit();
        }}
        className="space-y-6"
      >
        {(serverError || error) && (
          <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
            {serverError || error}
          </div>
        )}

        <TicketProfileDetailsSection values={values} onFieldChange={setField} />
        <TicketProfileGroupsSection
          values={values}
          tiers={tiers}
          addGroup={addGroup}
          removeGroup={removeGroup}
          updateGroupField={updateGroupField}
          addTicket={addTicket}
          removeTicket={removeTicket}
          updateTicketField={updateTicketField}
        />

        <FormActions
          onCancel={onBack}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
        />
      </form>
    </div>
  );
}
