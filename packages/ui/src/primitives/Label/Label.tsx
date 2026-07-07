import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { labelClasses, requiredClasses, hintClasses } from './Label.styles';
import type { LabelProps } from './Label.types';

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required = false, hint, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(labelClasses, className)}
        {...props}
      >
        <span>
          {children}
          {required && (
            <span className={requiredClasses} aria-hidden="true">
              *
            </span>
          )}
        </span>
        {hint && <span className={hintClasses}>{hint}</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';
