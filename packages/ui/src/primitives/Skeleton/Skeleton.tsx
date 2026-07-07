import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { SkeletonProps, EventGridSkeletonProps } from './Skeleton.types';
import { skeletonBaseClasses } from './Skeleton.styles';

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height, rounded = true, style, ...props }, ref) => {
    const customStyle: React.CSSProperties = {
      width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
      height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      ...style,
    };

    return (
      <div
        ref={ref}
        style={customStyle}
        className={cn(
          skeletonBaseClasses,
          rounded === true && 'rounded-md',
          typeof rounded === 'string' && rounded,
          className
        )}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * Backward compatibility component.
 * EventGridSkeleton renders a grid of pulsing placeholder blocks.
 */
export function EventGridSkeleton({ count = 4, className = '' }: EventGridSkeletonProps) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} height={288} rounded="rounded-2xl" />
      ))}
    </div>
  );
}
