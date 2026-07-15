import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { badgeSizes, badgeVariants } from './Badge.styles';
import type { BadgeProps } from './Badge.types';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium select-none',
          badgeSizes[size],
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
