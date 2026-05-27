import { EVENT_CATEGORY_LABELS } from "@mad/shared";

import { FormField } from "@/components/forms/primitives/FormField";
import { FormSection } from "@/components/forms/primitives/FormSection";
import { AdminCategory } from "@/lib/api/admin/category.service";
import { EventFormMode, EventFormValues } from "@/types/event-form";

export function EventDetailsSection({
  values,
  categories,
  mode,
  onFieldChange,
  inputCls,
}: {
  values: EventFormValues;
  categories: AdminCategory[];
  mode: EventFormMode;
  onFieldChange: <K extends keyof EventFormValues>(
    field: K,
    value: EventFormValues[K],
  ) => void;
  inputCls: string;
}) {
  return (
    <FormSection title="Basic Information">
      <FormField label="Event Title *">
        <input
          value={values.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          required
          className={inputCls}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Category">
          <select
            value={values.category}
            onChange={(e) => onFieldChange("category", e.target.value)}
            className={inputCls}
          >
            {categories.length > 0
              ? categories.map((cat) => (
                  <option
                    key={cat._id}
                    value={cat.slug}
                    className="bg-background-card"
                  >
                    {cat.name}
                  </option>
                ))
              : Object.entries(EVENT_CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-background-card">
                    {label}
                  </option>
                ))}
          </select>
        </FormField>
        <FormField label="Status">
          <select
            value={values.status}
            onChange={(e) => onFieldChange("status", e.target.value)}
            className={inputCls}
          >
            <option value="draft" className="bg-background-card">
              Draft
            </option>
            <option value="published" className="bg-background-card">
              Published
            </option>
            {mode === "edit" && (
              <option value="cancelled" className="bg-background-card">
                Cancelled
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Venue *">
          <input
            value={values.venueName}
            onChange={(e) => onFieldChange("venueName", e.target.value)}
            required
            className={inputCls}
          />
        </FormField>
      </div>
      <FormField label="Full Description *">
        <textarea
          value={values.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          required
          rows={5}
          className={`${inputCls} resize-none`}
        />
      </FormField>
    </FormSection>
  );
}
