import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { StackProps } from './Stack.types';
import {
  stackBaseClasses,
  stackDirections,
  stackGaps,
  stackAligns,
  stackJustifies,
} from './Stack.styles';

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction = 'col',
      gap = 'md',
      align = 'stretch',
      justify = 'start',
      wrap = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          stackBaseClasses,
          stackDirections[direction],
          stackGaps[gap],
          stackAligns[align],
          stackJustifies[justify],
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      />
    );
  }
);

Stack.displayName = 'Stack';
