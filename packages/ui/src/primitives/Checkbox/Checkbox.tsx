'use client';

import React, { forwardRef, useEffect, useRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
  label?: string;
  description?: React.ReactNode;
  error?: string;
  required?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      indeterminate = false,
      label,
      description,
      error,
      required,
      checked,
      disabled,
      id: providedId,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const id = providedId || React.useId();
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;

    // Handle forwarded ref alongside internal ref
    const setRefs = (element: HTMLInputElement | null) => {
      internalRef.current = element;
      if (typeof forwardedRef === 'function') {
        forwardedRef(element);
      } else if (forwardedRef) {
        forwardedRef.current = element;
      }
    };

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const ariaDescribedBy = [
      description ? descriptionId : null,
      error ? errorId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={clsx('flex items-start gap-3', className)}>
        <div className="flex items-center h-6">
          <input
            {...props}
            type="checkbox"
            id={id}
            ref={setRefs}
            checked={checked}
            disabled={disabled}
            aria-checked={indeterminate ? 'mixed' : !!checked}
            aria-describedby={ariaDescribedBy}
            aria-invalid={!!error}
            aria-required={required}
            className={clsx(
              'peer relative appearance-none w-5 h-5 border-2 rounded shrink-0 bg-transparent transition-all outline-none cursor-pointer',
              'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 text-red-500'
                : 'border-border-default text-brand-primary hover:border-brand-primary',
              (checked || indeterminate) && 'bg-current border-current'
            )}
          />
          {/* Check icon */}
          <svg
            className={clsx(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-surface-elevated transition-transform',
              checked && !indeterminate ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
            viewBox="0 0 14 14"
            fill="none"
          >
            <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* Indeterminate icon */}
          <svg
            className={clsx(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-surface-elevated transition-transform',
              indeterminate ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
            viewBox="0 0 14 14"
            fill="none"
          >
            <path d="M3 7H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {(label || description || error) && (
          <div className="flex flex-col pt-0.5">
            {label && (
              <label
                htmlFor={id}
                className={clsx(
                  'text-sm font-medium select-none cursor-pointer',
                  disabled ? 'text-text-muted opacity-50 cursor-not-allowed' : 'text-text-primary',
                  error && 'text-red-500'
                )}
              >
                {label}
                {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
              </label>
            )}
            {description && (
              <p id={descriptionId} className="text-sm text-text-muted mt-1">
                {description}
              </p>
            )}
            {error && (
              <p id={errorId} className="text-sm text-red-500 mt-1 font-medium">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
