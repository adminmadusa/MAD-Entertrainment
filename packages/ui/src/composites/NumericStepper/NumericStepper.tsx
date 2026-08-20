'use client';

import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import type { NumericStepperProps } from './NumericStepper.types';

export const NumericStepper = forwardRef<HTMLDivElement, NumericStepperProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = Infinity,
      step = 1,
      disabled = false,
      size = 'md',
      label,
      className,
      'aria-label': ariaLabel = 'Quantity selector',
      ...props
    },
    ref
  ) => {
    const canDecrement = !disabled && value > min;
    const canIncrement = !disabled && value < max;

    const handleDecrement = () => {
      if (canDecrement) {
        onChange(Math.max(min, value - step));
      }
    };

    const handleIncrement = () => {
      if (canIncrement) {
        onChange(Math.min(max, value + step));
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10);
      if (isNaN(parsed)) {
        onChange(min);
        return;
      }
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    };

    const sizeClasses = {
      sm: {
        container: 'min-h-[36px]',
        button: 'w-8 h-8 text-sm',
        input: 'w-10 text-xs py-1',
      },
      md: {
        container: 'min-h-[44px]',
        button: 'w-10 h-10 min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] text-base',
        input: 'w-12 text-sm py-1.5',
      },
      lg: {
        container: 'min-h-[48px]',
        button: 'w-12 h-12 min-w-[48px] min-h-[48px] text-lg',
        input: 'w-14 text-base py-2',
      },
    }[size];

    return (
      <div
        ref={ref}
        role="group"
        aria-label={label || ariaLabel}
        className={cn(
          'inline-flex items-center glass border border-border-subtle rounded-xl p-1 shadow-sm select-none',
          sizeClasses.container,
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label={`Decrease ${label || 'quantity'}`}
          className={cn(
            'flex items-center justify-center rounded-lg font-bold text-text transition-all',
            'hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple',
            sizeClasses.button
          )}
        >
          −
        </button>

        {/* Value Display / Direct Input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max === Infinity ? undefined : max}
          aria-label={label || ariaLabel}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn(
            'bg-transparent text-center font-bold text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded',
            sizeClasses.input
          )}
        />

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label={`Increase ${label || 'quantity'}`}
          className={cn(
            'flex items-center justify-center rounded-lg font-bold text-text transition-all',
            'hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple',
            sizeClasses.button
          )}
        >
          +
        </button>
      </div>
    );
  }
);

NumericStepper.displayName = 'NumericStepper';
