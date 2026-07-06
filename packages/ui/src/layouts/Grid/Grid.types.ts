import { HTMLAttributes, ReactNode } from 'react';

export type GridColsCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GridResponsiveCols {
  base?: GridColsCount;
  sm?: GridColsCount;
  md?: GridColsCount;
  lg?: GridColsCount;
  xl?: GridColsCount;
}

export type GridGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The number of columns. Can be a fixed number or a responsive mapping object.
   * @default 1
   */
  cols?: GridColsCount | GridResponsiveCols;
  /**
   * Spacing gap between elements.
   * @default 'md'
   */
  gap?: GridGap;
  /**
   * Grid children.
   */
  children?: ReactNode;
}
