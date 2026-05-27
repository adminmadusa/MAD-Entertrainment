import { FormField } from '@/components/forms/primitives/FormField';
import { FormSection } from '@/components/forms/primitives/FormSection';
import { EventFormValues } from '@/types/event-form';

export function EventAdditionalSection({
  values,
  onFieldChange,
  inputCls,
}: {
  values: EventFormValues;
  onFieldChange: <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => void;
  inputCls: string;
}) {
  return (
    <FormSection title="Additional Details">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Organizer Name">
          <input value={values.organizerName} onChange={(e) => onFieldChange('organizerName', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Highlights (comma separated)">
          <input value={values.highlightsInput} onChange={(e) => onFieldChange('highlightsInput', e.target.value)} className={inputCls} />
        </FormField>
      </div>
      <FormField label="Refund Policy">
        <textarea value={values.refundPolicy} onChange={(e) => onFieldChange('refundPolicy', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </FormField>
    </FormSection>
  );
}
