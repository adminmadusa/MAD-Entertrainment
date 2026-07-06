import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from '../Spinner';
import { ButtonProps } from './Button.types';
import { buttonSizes, buttonVariants } from './Button.styles';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-fast select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          fullWidth && 'w-full',
          buttonSizes[size],
          buttonVariants[variant],
          className
        )}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading ? 'true' : undefined}
        {...props}
      >
        {isLoading && (
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            className="mr-2"
          />
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
