import { HTMLAttributes } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The semantic variant of the badge.
   * @default 'default'
   */
  variant?: BadgeVariant;
  /**
   * The size of the badge.
   * @default 'md'
   */
  size?: BadgeSize;
}
