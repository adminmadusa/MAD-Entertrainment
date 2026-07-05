// packages/ui/src/components/FormField.tsx
// Shared form field wrapper — replaces per-file Field implementations.
// Addresses VAL-UI-006: Local duplication of <Field> wrapper.

import React from 'react';

export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Optional id of the associated input (maps to htmlFor on the <label>) */
  htmlFor?: string;
  /** Optional helper / hint text displayed inline after the label */
  hint?: string;
  children: React.ReactNode;
}

/**
 * Shared form field layout wrapper used across admin forms.
 *
 * Renders a `<div>` with a `<label>` and the field children.
 * Accepts an optional `htmlFor` for explicit label–input association
 * and an optional `hint` for helper text.
 *
 * @example
 * ```tsx
 * import { FormField } from '@mad/ui';
 *
 * <FormField label="Event Name" htmlFor="event-name">
 *   <input id="event-name" ... />
 * </FormField>
 * ```
 */
export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, hint, children }) => {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-text-secondary text-sm font-medium block"
      >
        {label}
        {hint && (
          <span className="ml-2 text-[11px] text-text-muted font-normal">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
};
