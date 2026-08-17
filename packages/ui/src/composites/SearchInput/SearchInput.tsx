'use client';

import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';

import { SearchIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { Spinner } from '../../primitives/Spinner';
import type { SearchInputProps } from './SearchInput.types';

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value: controlledValue,
      defaultValue = '',
      onChange,
      onSearch,
      onClear,
      debounceMs = 300,
      clearable = true,
      loading = false,
      placeholder = 'Search...',
      disabled = false,
      className,
      containerClassName,
      'aria-label': ariaLabel = 'Search input',
      ...props
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      isControlled ? controlledValue : defaultValue
    );
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (isControlled) {
        setInternalValue(controlledValue);
      }
    }, [isControlled, controlledValue]);

    const triggerDebouncedSearch = useCallback(
      (val: string) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        if (debounceMs > 0 && onSearch) {
          debounceTimerRef.current = setTimeout(() => {
            onSearch(val);
          }, debounceMs);
        } else if (onSearch) {
          onSearch(val);
        }
      },
      [debounceMs, onSearch]
    );

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      if (!isControlled) {
        setInternalValue(newVal);
      }
      onChange?.(newVal);
      triggerDebouncedSearch(newVal);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      onChange?.('');
      onClear?.();
      onSearch?.('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && internalValue && clearable) {
        handleClear();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        onSearch?.(internalValue);
      }
    };

    const hasValue = Boolean(internalValue && internalValue.length > 0);

    return (
      <div
        className={cn(
          'relative flex items-center w-full min-h-[44px]',
          containerClassName
        )}
      >
        {/* Leading Search Icon */}
        <div
          className="absolute left-3.5 flex items-center pointer-events-none text-text-muted"
          aria-hidden="true"
        >
          {loading ? (
            <Spinner size="sm" className="text-accent-purple" />
          ) : (
            <SearchIcon className="w-4 h-4" />
          )}
        </div>

        <input
          ref={ref}
          type="search"
          role="searchbox"
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'w-full min-h-[44px] pl-10 pr-10 py-2 text-sm text-text bg-white/5 border border-border-subtle rounded-xl placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-accent-purple/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />

        {/* Trailing Clear Button */}
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
