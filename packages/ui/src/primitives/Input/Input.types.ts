import { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /**
   * Optional error message. Renders input with a red border.
   */
  error?: string;
  /**
   * Element (e.g. icon or symbol) rendered on the left inside the input.
   */
  prefix?: ReactNode;
  /**
   * Element (e.g. icon or action) rendered on the right inside the input.
   */
  suffix?: ReactNode;
}
