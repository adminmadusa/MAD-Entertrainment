import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, EventGridSkeleton } from './Skeleton';

describe('Skeleton Component', () => {
  it('renders skeleton element', () => {
    const { container } = render(<Skeleton width={100} height={20} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton.style.width).toBe('100px');
    expect(skeleton.style.height).toBe('20px');
  });

  it('renders EventGridSkeleton with default count', () => {
    const { container } = render(<EventGridSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });
});
