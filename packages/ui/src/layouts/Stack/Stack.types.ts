import { HTMLAttributes, ReactNode } from 'react';

export type StackDirection = 'row' | 'col';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around';
export type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Direction of the flex layouts.
   * @default 'col'
   */
  direction?: StackDirection;
  /**
   * Spacing gap between elements.
   * @default 'md'
   */
  gap?: StackGap;
  /**
   * Alignment along cross axis.
   * @default 'stretch'
   */
  align?: StackAlign;
  /**
   * Alignment along main axis.
   * @default 'start'
   */
  justify?: StackJustify;
  /**
   * Toggles item wrapping.
   * @default false
   */
  wrap?: boolean;
  /**
   * Stack children.
   */
  children?: ReactNode;
}
