import { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Optional error message. Renders textarea with a red border.
   */
  error?: string;
  /**
   * Displays character count. Requires `maxLength` to be defined.
   */
  showCharacterCount?: boolean;
}
