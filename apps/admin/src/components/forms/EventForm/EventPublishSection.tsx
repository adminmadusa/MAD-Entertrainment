import { FormField } from '@/components/forms/primitives/FormField';
import { FormSection } from '@/components/forms/primitives/FormSection';
import { EventFormValues } from '@/types/event-form';

export function EventPublishSection({
  values,
  onFieldChange,
  inputCls,
}: {
  values: EventFormValues;
  onFieldChange: <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => void;
  inputCls: string;
}) {
  return (
    <FormSection title="Options">
      <FormField label="Tags (comma-separated)">
        <input value={values.tags} onChange={(e) => onFieldChange('tags', e.target.value)} className={inputCls} />
      </FormField>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={values.isFeatured} onChange={(e) => onFieldChange('isFeatured', e.target.checked)} className="w-4 h-4 accent-accent-purple rounded" />
          <span className="text-text-secondary text-sm">Feature on homepage</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={values.isAgeRestricted} onChange={(e) => onFieldChange('isAgeRestricted', e.target.checked)} className="w-4 h-4 accent-accent-purple rounded" />
          <span className="text-text-secondary text-sm">Age restricted</span>
        </label>
      </div>
      {values.isAgeRestricted && (
        <FormField label="Minimum Age">
          <input type="number" min={0} max={100} value={values.minimumAge} onChange={(e) => onFieldChange('minimumAge', Number(e.target.value))} className={`${inputCls} max-w-24`} />
        </FormField>
      )}
    </FormSection>
  );
}
