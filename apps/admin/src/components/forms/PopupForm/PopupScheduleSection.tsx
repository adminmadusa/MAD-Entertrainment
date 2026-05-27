import { FormField, FormSection } from "@/components/forms/primitives";
import { POPUP_INPUT_CLASSNAME } from "@/components/forms/PopupForm/constants/popup-form.constants";
import { PopupFormValues } from "@/types/popup-form";

interface PopupScheduleSectionProps {
  values: PopupFormValues;
  onFieldChange: <K extends keyof PopupFormValues>(
    field: K,
    value: PopupFormValues[K],
  ) => void;
}

export function PopupScheduleSection({
  values,
  onFieldChange,
}: PopupScheduleSectionProps) {
  return (
    <FormSection title="Schedule">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start Date">
          <input
            id="popup-start-date"
            type="datetime-local"
            value={values.startDate}
            onChange={(e) => onFieldChange("startDate", e.target.value)}
            className={POPUP_INPUT_CLASSNAME}
          />
        </FormField>
        <FormField label="End Date">
          <input
            id="popup-end-date"
            type="datetime-local"
            value={values.endDate}
            onChange={(e) => onFieldChange("endDate", e.target.value)}
            className={POPUP_INPUT_CLASSNAME}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
