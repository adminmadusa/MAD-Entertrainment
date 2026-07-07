import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { SectionProps } from './Section.types';
import { sectionBaseClasses, sectionSpacings } from './Section.styles';

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
