import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ImageWrapper } from './ImageWrapper';

describe('ImageWrapper Component', () => {
  it('renders Next.js Image component when valid src is provided', () => {
    render(<ImageWrapper src="/test-poster.webp" alt="Test Poster" width={300} height={200} />);
    const img = screen.getByAltText('Test Poster');
    expect(img).toBeInTheDocument();
  });

  it('renders fallback icon without errors when image fails to load (onError)', () => {
    render(<ImageWrapper src="/missing-poster.webp" alt="Missing Poster" width={300} height={200} />);
    const img = screen.getByAltText('Missing Poster');

    fireEvent.error(img);

    expect(screen.queryByAltText('Missing Poster')).not.toBeInTheDocument();
    const fallbackSvg = document.querySelector('svg');
    expect(fallbackSvg).toBeInTheDocument();
  });

  it('renders custom fallbackIcon when provided and image fails to load', () => {
    render(
      <ImageWrapper
        src="/missing-poster.webp"
        alt="Custom Fallback Poster"
        width={300}
        height={200}
        fallbackIcon={<span data-testid="custom-fallback">Custom Icon</span>}
      />
    );
    const img = screen.getByAltText('Custom Fallback Poster');

    fireEvent.error(img);

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('renders fallback UI immediately when src is empty or null', () => {
    render(<ImageWrapper src="" alt="Empty Src" width={300} height={200} />);
    expect(screen.queryByAltText('Empty Src')).not.toBeInTheDocument();
    const fallbackSvg = document.querySelector('svg');
    expect(fallbackSvg).toBeInTheDocument();
  });
});
