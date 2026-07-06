import { ElementType, HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'glass' | 'outline';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /**
   * Visual theme variants.
   * @default 'default'
   */
  variant?: CardVariant;
  /**
   * Padding sizes.
   * @default 'md'
   */
  padding?: CardPadding;
  /**
   * Renders the card as a specific HTML tag (e.g. 'div', 'article', 'section', etc.).
   * @default 'div'
   */
  as?: ElementType;
  /**
   * Card body content.
   */
  children?: ReactNode;
}
