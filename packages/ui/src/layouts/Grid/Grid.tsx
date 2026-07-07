import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { GridProps } from './Grid.types';
import {
  gridBaseClasses,
  gridGaps,
  gridColsMap,
  gridSmColsMap,
  gridMdColsMap,
  gridLgColsMap,
  gridXlColsMap,
} from './Grid.styles';

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = 'md', ...props }, ref) => {
    let colClasses = '';
    if (typeof cols === 'number') {
      colClasses = gridColsMap[cols];
    } else {
      const { base, sm, md, lg, xl } = cols;
      colClasses = cn(
        base && gridColsMap[base],
        sm && gridSmColsMap[sm],
        md && gridMdColsMap[md],
        lg && gridLgColsMap[lg],
        xl && gridXlColsMap[xl]
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          gridBaseClasses,
          colClasses,
          gridGaps[gap],
          className
        )}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';
