import { FormField, FormSection } from '@/components/forms/primitives';
import { POPUP_INPUT_CLASSNAME } from '@/components/forms/PopupForm/constants/popup-form.constants';
import { PopupFormValues } from '@/types/popup-form';

interface PopupTargetingSectionProps {
  values: PopupFormValues;
  onFieldChange: <K extends keyof PopupFormValues>(field: K, value: PopupFormValues[K]) => void;
}

export function PopupTargetingSection({ values, onFieldChange }: PopupTargetingSectionProps) {
  return (
    <FormSection title="Scope & Targeting">
      <FormField label="Show on pages (comma-separated, blank for all)">
        <input value={values.showOnPages} onChange={(e) => onFieldChange('showOnPages', e.target.value)} placeholder="e.g. /, /events, /venues" className={POPUP_INPUT_CLASSNAME} />
      </FormField>
      <FormField label="Linked Event ID (optional)">
        <input value={values.linkedEventId} onChange={(e) => onFieldChange('linkedEventId', e.target.value)} placeholder="e.g. 6a11621b76456c3977198702" className={POPUP_INPUT_CLASSNAME} />
      </FormField>
    </FormSection>
  );
}
