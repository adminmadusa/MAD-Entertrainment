import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { FormField, FormSection } from "@/components/forms/primitives";
import { POPUP_INPUT_CLASSNAME } from "@/components/forms/PopupForm/constants/popup-form.constants";
import { PopupFormValues } from "@/types/popup-form";

interface PopupContentSectionProps {
  values: PopupFormValues;
  onFieldChange: <K extends keyof PopupFormValues>(
    field: K,
    value: PopupFormValues[K],
  ) => void;
}

export function PopupContentSection({
  values,
  onFieldChange,
}: PopupContentSectionProps) {
  return (
    <>
      <div className="glass rounded-2xl border border-border-subtle p-4 sm:p-6">
        <CloudinaryUpload
          folder="popups"
          value={values.image}
          onChange={(value) => onFieldChange("image", value)}
          label="Campaign Banner Image (optional)"
          aspectRatio="aspect-video"
          id="popup-banner-image"
        />
      </div>

      <FormSection title="Campaign Setup">
        <FormField label="Campaign Name *">
          <input
            id="popup-name"
            value={values.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            required
            className={POPUP_INPUT_CLASSNAME}
          />
        </FormField>
        <FormField label="Popup Title *">
          <input
            id="popup-title"
            value={values.title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            required
            className={POPUP_INPUT_CLASSNAME}
          />
        </FormField>
        <FormField label="Description (optional)">
          <textarea
            id="popup-description"
            value={values.description}
            onChange={(e) => onFieldChange("description", e.target.value)}
            rows={3}
            className={`${POPUP_INPUT_CLASSNAME} resize-none`}
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="CTA Button Text (optional)">
            <input
              value={values.ctaText}
              onChange={(e) => onFieldChange("ctaText", e.target.value)}
              className={POPUP_INPUT_CLASSNAME}
            />
          </FormField>
          <FormField label="CTA Destination URL (optional)">
            <input
              value={values.ctaUrl}
              onChange={(e) => onFieldChange("ctaUrl", e.target.value)}
              className={POPUP_INPUT_CLASSNAME}
            />
          </FormField>
        </div>
      </FormSection>
    </>
  );
}
