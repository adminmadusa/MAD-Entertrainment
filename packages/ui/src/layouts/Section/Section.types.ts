import { HTMLAttributes, ReactNode } from 'react';

export type SectionSpacing = 'sm' | 'md' | 'lg';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /**
   * The vertical padding scale.
   * @default 'md'
   */
  spacing?: SectionSpacing;
  /**
   * Accessible description label for screen readers.
   */
  'aria-label'?: string;
  /**
   * Section content.
   */
  children?: ReactNode;
}
