import { EVENT_FORM_INPUT_CLASS } from "@/components/forms/constants/event-form.constants";
import { FormField, FormSection } from "@/components/forms/primitives";
import { TicketProfileFormValues } from "@/types/ticket-profile-form";

export function TicketProfileDetailsSection({
  values,
  onFieldChange,
}: {
  values: TicketProfileFormValues;
  onFieldChange: <K extends keyof TicketProfileFormValues>(
    field: K,
    value: TicketProfileFormValues[K],
  ) => void;
}) {
  return (
    <FormSection title="Profile Info">
      <FormField label="Profile Name *">
        <input
          value={values.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          required
          className={EVENT_FORM_INPUT_CLASS}
        />
      </FormField>
      <FormField label="Description">
        <textarea
          value={values.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          rows={3}
          className={`${EVENT_FORM_INPUT_CLASS} resize-none`}
        />
      </FormField>
    </FormSection>
  );
}
