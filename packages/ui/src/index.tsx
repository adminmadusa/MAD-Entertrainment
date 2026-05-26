'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({
  className = '',
  type = 'button',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
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
}

export function EventGridSkeleton({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-white/10" />
      ))}
    </div>
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: string;
  showCloseButton?: boolean;
  children?: ReactNode;
}

export function Modal({ isOpen, onClose, size, showCloseButton, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background relative w-full max-w-md rounded-2xl p-6 shadow-2xl">
        {showCloseButton && (
          <button onClick={onClose} className="absolute right-4 top-4 text-white">X</button>
        )}
        {children}
      </div>
    </div>
  );
}

export function ScrollIndicator() {
  return <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white">↓</div>;
}

