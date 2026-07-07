import { HTMLAttributes } from 'react';

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Accessible text label describing what is being loaded.
   * @default 'Loading content...'
   */
  label?: string;
}
