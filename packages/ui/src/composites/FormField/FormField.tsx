import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { Label } from '../../primitives/Label';
import { formFieldContainerClasses } from './FormField.styles';
import type { FormFieldProps } from './FormField.types';

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, htmlFor, hint, error, required = false, children, ...props }, ref) => {
    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<any>;
        const childProps: Record<string, any> = {};
        if (error) {
          childProps.error = error;
        }
        if (htmlFor && !element.props.id) {
          childProps.id = htmlFor;
        }
        if (required && element.props['aria-required'] === undefined) {
          childProps['aria-required'] = 'true';
        }
        return React.cloneElement(element, childProps);
      }
      return child;
    });

    return (
      <div ref={ref} className={cn(formFieldContainerClasses, className)} {...props}>
        <Label htmlFor={htmlFor} required={required} hint={hint}>
          {label}
        </Label>
        {childrenWithProps}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
