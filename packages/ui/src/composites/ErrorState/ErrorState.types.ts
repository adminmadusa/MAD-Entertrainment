import { HTMLAttributes, ReactNode } from 'react';

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Title error message.
   */
  title?: string;
  /**
   * Supporting message describing the error.
   */
  description?: string;
  /**
   * Backward-compatibility alias for title.
   */
  message?: string;
  /**
   * Optional custom icon.
   */
  icon?: ReactNode;
  /**
   * Fired when clicking the retry action button. If provided, renders default retry CTA.
   */
  onRetry?: () => void;
  /**
   * Backward-compatibility alias for onRetry.
   */
  retry?: () => void;
  /**
   * Custom CTA action button (replaces retry button).
   */
  action?: ReactNode;
}
