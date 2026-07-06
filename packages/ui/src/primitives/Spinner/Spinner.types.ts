import { HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The size of the spinner.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Accessible label for screen readers.
   * @default 'Loading'
   */
  'aria-label'?: string;
}
