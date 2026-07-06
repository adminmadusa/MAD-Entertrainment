import { LabelHTMLAttributes } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * The associated form input id.
   */
  htmlFor?: string;
  /**
   * Appends an asterisk (*) colored in red to designate required fields.
   */
  required?: boolean;
  /**
   * Supporting inline help text displayed next to the label.
   */
  hint?: string;
}
