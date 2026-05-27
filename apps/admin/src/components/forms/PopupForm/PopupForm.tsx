"use client";

import { PopupCampaign } from "@mad/types";
import { motion } from "framer-motion";

import { FormActions } from "@/components/forms/primitives";
import { usePopupForm } from "@/hooks/forms/use-popup-form";
import { PopupFormMode } from "@/types/popup-form";
import { PopupContentSection } from "./PopupContentSection";
import { PopupPublishSection } from "./PopupPublishSection";
import { PopupScheduleSection } from "./PopupScheduleSection";
import { PopupTargetingSection } from "./PopupTargetingSection";
import { PopupVisibilitySection } from "./PopupVisibilitySection";

interface PopupFormProps {
  mode: PopupFormMode;
  initialPopup?: PopupCampaign;
  isSubmitting: boolean;
  serverError: string;
  onBack: () => void;
  onSubmitPayload: Parameters<typeof usePopupForm>[0]["onSubmitPayload"];
}

export function PopupForm({
  mode,
  initialPopup,
  isSubmitting,
  serverError,
  onBack,
  onSubmitPayload,
}: PopupFormProps) {
  const { values, error, visibilityState, setField, submit } = usePopupForm({
    mode,
    initialPopup,
    onSubmitPayload,
  });

  const submitLabel = isSubmitting
    ? mode === "create"
      ? "Creating..."
      : "Saving Changes..."
    : mode === "create"
      ? "Create Campaign"
      : "Save Changes";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            {mode === "create" ? "Create Campaign" : "Edit Campaign"}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === "create"
              ? "Configure a new engagement popup banner"
              : "Modify campaign parameters"}
          </p>
          <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">
            Visibility: {visibilityState}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {serverError || error}
          </motion.div>
        )}

        <PopupContentSection values={values} onFieldChange={setField} />
        <PopupVisibilitySection values={values} onFieldChange={setField} />
        <PopupTargetingSection values={values} onFieldChange={setField} />
        <PopupScheduleSection values={values} onFieldChange={setField} />
        <PopupPublishSection values={values} onFieldChange={setField} />

        <FormActions
          onCancel={onBack}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
        />
      </form>
    </div>
  );
}
