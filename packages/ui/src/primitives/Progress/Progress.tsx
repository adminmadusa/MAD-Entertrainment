import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import {
  progressContainerClasses,
  progressFillBaseClasses,
  progressVariants,
} from './Progress.styles';
import type { ProgressProps } from './Progress.types';

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, label, variant = 'default', ...props }, ref) => {
    const clampedValue = Math.min(Math.max(value, 0), 100);

    return (
      <div className={cn('w-full', className)} {...props}>
        {label && (
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>{label}</span>
            <span>{Math.round(clampedValue)}%</span>
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Loading progress'}
          className={progressContainerClasses}
        >
          <div
            className={cn(progressFillBaseClasses, progressVariants[variant])}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';
