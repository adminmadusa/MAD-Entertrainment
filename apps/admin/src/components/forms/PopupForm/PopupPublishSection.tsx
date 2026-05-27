import { FormSection } from '@/components/forms/primitives';
import { PopupFormValues } from '@/types/popup-form';

interface PopupPublishSectionProps {
  values: PopupFormValues;
  onFieldChange: <K extends keyof PopupFormValues>(field: K, value: PopupFormValues[K]) => void;
}

export function PopupPublishSection({ values, onFieldChange }: PopupPublishSectionProps) {
  return (
    <FormSection title="Publish">
      <div className="flex items-center gap-3 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          id="popup-active"
          checked={values.isActive}
          onChange={(e) => onFieldChange('isActive', e.target.checked)}
          className="w-4 h-4 accent-accent-purple rounded"
        />
        <label htmlFor="popup-active" className="text-text-secondary text-sm">
          Mark this popup campaign as active immediately
        </label>
      </div>
    </FormSection>
  );
}
