'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { TextareaProps } from './Textarea.types';
import {
  textareaContainerClasses,
  textareaDefaultBorder,
  textareaErrorBorder,
  textareaDisabledClasses,
  textareaFieldClasses,
  countWrapperClasses,
  errorTextClasses,
} from './Textarea.styles';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      showCharacterCount = false,
      disabled,
      id,
      maxLength,
      onChange,
      value,
      defaultValue,
      'aria-describedby': ariaDescribedby,
      ...props
    },
    ref
  ) => {
    const initialValue = value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : '';
    const [charCount, setCharCount] = useState(initialValue.length);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (onChange) {
        onChange(e);
      }
    };

    const errorId = id ? `${id}-error` : undefined;
    const describedBy = cn(ariaDescribedby, errorId);

    const hasCount = showCharacterCount && maxLength !== undefined;

    return (
      <div className="w-full">
        <div
          className={cn(
            textareaContainerClasses,
            error ? textareaErrorBorder : textareaDefaultBorder,
            disabled && textareaDisabledClasses,
            hasCount && 'pb-6'
          )}
        >
          <textarea
            ref={ref}
            id={id}
            disabled={disabled}
            maxLength={maxLength}
            onChange={handleTextareaChange}
            value={value}
            defaultValue={defaultValue}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(textareaFieldClasses, className)}
            {...props}
          />
          {hasCount && (
            <span className={countWrapperClasses}>
              {charCount}/{maxLength}
            </span>
          )}
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

Textarea.displayName = 'Textarea';
