import { HTMLAttributes, ReactNode } from 'react';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Header title for the empty state.
   */
  title: string;
  /**
   * Description explaining why the resource is empty or what to do next.
   */
  description?: string;
  /**
   * Optional icon component placed above the title.
   */
  icon?: ReactNode;
  /**
   * Optional primary action element (e.g. Button or link).
   */
  action?: ReactNode;
}
