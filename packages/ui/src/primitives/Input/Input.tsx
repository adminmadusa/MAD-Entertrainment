import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import {
  inputContainerClasses,
  inputDefaultBorder,
  inputErrorBorder,
  inputDisabledClasses,
  inputFieldClasses,
  prefixWrapperClasses,
  suffixWrapperClasses,
  errorTextClasses,
} from './Input.styles';
import type { InputProps } from './Input.types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, prefix, suffix, disabled, id, 'aria-describedby': ariaDescribedby, ...props }, ref) => {
    const errorId = id ? `${id}-error` : undefined;
    const describedBy = cn(ariaDescribedby, errorId);

    return (
      <div className="w-full">
        <div
          className={cn(
            inputContainerClasses,
            error ? inputErrorBorder : inputDefaultBorder,
            disabled && inputDisabledClasses
          )}
        >
          {prefix && <span className={prefixWrapperClasses}>{prefix}</span>}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              inputFieldClasses,
              prefix && 'pl-1.5',
              suffix && 'pr-1.5',
              className
            )}
            {...props}
          />
          {suffix && <span className={suffixWrapperClasses}>{suffix}</span>}
        </div>
        {error && (
          <p id={errorId} className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
