import { ReactNode } from 'react';

export interface FormFieldProps {
  /**
   * The text label for the field.
   */
  label: string;
  /**
   * The associated input element's ID (maps to htmlFor on the Label).
   */
  htmlFor?: string;
  /**
   * Optional inline helper / hint text displayed next to the label.
   */
  hint?: string;
  /**
   * Optional error message. Renders the error text block and styles input states.
   */
  error?: string;
  /**
   * Indicates whether the field is required. Renders required asterisk next to label.
   */
  required?: boolean;
  /**
   * The form input component.
   */
  children: ReactNode;
  /**
   * Custom grid or container classes.
   */
  className?: string;
}
