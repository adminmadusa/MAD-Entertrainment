import { FormField, FormSection } from '@/components/forms/primitives';
import { POPUP_INPUT_CLASSNAME } from '@/components/forms/PopupForm/constants/popup-form.constants';
import { PopupFormValues } from '@/types/popup-form';

interface PopupVisibilitySectionProps {
  values: PopupFormValues;
  onFieldChange: <K extends keyof PopupFormValues>(field: K, value: PopupFormValues[K]) => void;
}

export function PopupVisibilitySection({ values, onFieldChange }: PopupVisibilitySectionProps) {
  return (
    <FormSection title="Trigger & Constraints">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Trigger Type">
          <select value={values.trigger} onChange={(e) => onFieldChange('trigger', e.target.value as PopupFormValues['trigger'])} className={POPUP_INPUT_CLASSNAME}>
            <option value="on_load" className="bg-background-card">On Load</option>
            <option value="after_delay" className="bg-background-card">After Delay</option>
            <option value="on_exit" className="bg-background-card">Exit Intent</option>
            <option value="on_scroll" className="bg-background-card">Scroll Percentage</option>
          </select>
        </FormField>
        <FormField label="Trigger Delay (ms / percent value)">
          <input type="number" min="0" value={values.triggerDelay} onChange={(e) => onFieldChange('triggerDelay', e.target.value === '' ? '' : Number(e.target.value))} className={POPUP_INPUT_CLASSNAME} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cooldown Hours">
          <input type="number" min="1" value={values.cooldownHours} onChange={(e) => onFieldChange('cooldownHours', e.target.value === '' ? '' : Number(e.target.value))} className={POPUP_INPUT_CLASSNAME} />
        </FormField>
        <FormField label="Priority (higher = shown first)">
          <input type="number" value={values.priority} onChange={(e) => onFieldChange('priority', e.target.value === '' ? '' : Number(e.target.value))} className={POPUP_INPUT_CLASSNAME} />
        </FormField>
      </div>
    </FormSection>
  );
}
