import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../Button';
import { iconButtonSizes } from './IconButton.styles';
import type { IconButtonProps } from './IconButton.types';

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, 'aria-label': ariaLabel, size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center shrink-0 aspect-square p-0 min-w-0 min-h-0',
          iconButtonSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
