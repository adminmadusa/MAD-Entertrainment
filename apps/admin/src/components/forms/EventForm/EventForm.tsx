"use client";

import { FormActions } from "@/components/forms/primitives/FormActions";
import { EVENT_FORM_INPUT_CLASS } from "@/components/forms/constants/event-form.constants";
import { useEventForm } from "@/hooks/forms/use-event-form";
import { AdminCategory } from "@/lib/api/admin/category.service";
import { AdminTier } from "@/lib/api/admin/tier.service";
import { AdminEvent } from "@/lib/api/admin/event.service";
import { TicketProfile } from "@mad/types";
import { EventFormMode, EventMutationPayload } from "@/types/event-form";
import { EventMediaSection } from "./EventMediaSection";
import { EventDetailsSection } from "./EventDetailsSection";
import { EventAdditionalSection } from "./EventAdditionalSection";
import { EventScheduleSection } from "./EventScheduleSection";
import { EventTicketingSection } from "./EventTicketingSection";
import { EventPublishSection } from "./EventPublishSection";

interface EventFormProps {
  mode: EventFormMode;
  initialEvent?: AdminEvent;
  categories: AdminCategory[];
  tiers: AdminTier[];
  profiles: TicketProfile[];
  isSubmitting: boolean;
  serverError: string;
  onSubmitPayload: (payload: EventMutationPayload) => Promise<void> | void;
  onBack: () => void;
}

export function EventForm({
  mode,
  initialEvent,
  categories,
  tiers,
  profiles,
  isSubmitting,
  serverError,
  onSubmitPayload,
  onBack,
}: EventFormProps) {
  const {
    values,
    error,
    setField,
    addTier,
    removeTier,
    updateTier,
    setOverride,
    resetOverridesForProfile,
    submit,
  } = useEventForm({ mode, initialEvent, onSubmitPayload });

  const displayError = serverError || error;
  let submitLabel = mode === "create" ? "Create Event" : "Save Changes";
  if (isSubmitting)
    submitLabel = mode === "create" ? "Creating..." : "Saving...";

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">
            {mode === "create" ? "Create Event" : "Edit Event"}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === "create"
              ? "Fill in the details below"
              : "Modify event parameters and ticketing overrides"}
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
        {displayError && (
          <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
            {displayError}
          </div>
        )}

        <EventMediaSection
          coverImage={values.coverImage}
          onChange={(img) => setField("coverImage", img)}
        />
        <EventDetailsSection
          values={values}
          categories={categories}
          mode={mode}
          onFieldChange={setField}
          inputCls={inputCls}
        />
        <EventAdditionalSection
          values={values}
          onFieldChange={setField}
          inputCls={inputCls}
        />
        <EventScheduleSection
          values={values}
          onFieldChange={setField}
          inputCls={inputCls}
        />
        <EventTicketingSection
          values={values}
          tiers={tiers}
          profiles={profiles}
          onFieldChange={setField}
          addTier={addTier}
          removeTier={removeTier}
          updateTier={updateTier}
          setOverride={setOverride}
          resetOverridesForProfile={resetOverridesForProfile}
          inputCls={inputCls}
        />
        <EventPublishSection
          values={values}
          onFieldChange={setField}
          inputCls={inputCls}
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

const inputCls = EVENT_FORM_INPUT_CLASS;
