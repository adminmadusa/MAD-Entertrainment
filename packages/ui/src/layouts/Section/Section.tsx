import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { sectionBaseClasses, sectionSpacings } from './Section.styles';
import type { SectionProps } from './Section.types';

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = 'md', 'aria-label': ariaLabel, ...props }, ref) => {
    return (
      <section
        ref={ref}
        aria-label={ariaLabel}
        className={cn(sectionBaseClasses, sectionSpacings[spacing], className)}
        {...props}
      />
    );
  }
);

Section.displayName = 'Section';
