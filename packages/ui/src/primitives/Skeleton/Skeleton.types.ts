import { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the skeleton.
   * @default '100%'
   */
  width?: string | number;
  /**
   * Height of the skeleton.
   * @default '1rem'
   */
  height?: string | number;
  /**
   * Corner rounding behavior. If true, uses standard border radius. If false, no rounding.
   * Or can accept standard tailwind radius string classes.
   * @default true
   */
  rounded?: boolean | string;
}

export interface EventGridSkeletonProps {
  /**
   * Number of items in the skeleton grid.
   * @default 4
   */
  count?: number;
  /**
   * Optional custom grid container styles.
   */
  className?: string;
}
