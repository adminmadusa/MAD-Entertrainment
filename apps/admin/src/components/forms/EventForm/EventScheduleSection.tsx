import { FormField } from "@/components/forms/primitives/FormField";
import { FormSection } from "@/components/forms/primitives/FormSection";
import { EventFormValues } from "@/types/event-form";

export function EventScheduleSection({
  values,
  onFieldChange,
  inputCls,
}: {
  values: EventFormValues;
  onFieldChange: <K extends keyof EventFormValues>(
    field: K,
    value: EventFormValues[K],
  ) => void;
  inputCls: string;
}) {
  return (
    <FormSection title="Schedule">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start Date & Time *">
          <input
            type="datetime-local"
            value={values.startDate}
            onChange={(e) => onFieldChange("startDate", e.target.value)}
            required
            className={inputCls}
          />
        </FormField>
        <FormField label="End Date & Time">
          <input
            type="datetime-local"
            value={values.endDate}
            onChange={(e) => onFieldChange("endDate", e.target.value)}
            className={inputCls}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
