import { HTMLAttributes, ReactNode } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The semantic type of the alert message.
   * @default 'info'
   */
  variant?: AlertVariant;
  /**
   * Optional bold title header.
   */
  title?: string;
  /**
   * Callback fired when clicking the close button. If provided, renders close icon.
   */
  onDismiss?: () => void;
  /**
   * Custom icon element placed before content text. If omitted, uses default icons per variant.
   */
  icon?: ReactNode;
}
