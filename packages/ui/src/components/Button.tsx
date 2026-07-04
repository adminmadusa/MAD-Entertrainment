import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      type = 'button',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`${fullWidth ? 'w-full ' : ''}${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : leftIcon}
        {children}
        {!isLoading ? rightIcon : null}
      </button>
    );
  },
);

Button.displayName = 'Button';
