import { HTMLAttributes } from 'react';

export type ProgressVariant = 'default' | 'success' | 'danger';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The current value from 0 to 100.
   */
  value: number;
  /**
   * Accessible description label representing what is being loaded.
   */
  label?: string;
  /**
   * Visual variant representing success/danger states.
   * @default 'default'
   */
  variant?: ProgressVariant;
}
