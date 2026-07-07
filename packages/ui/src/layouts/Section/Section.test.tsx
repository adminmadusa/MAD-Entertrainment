import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Section } from './Section';

describe('Section Component', () => {
  it('renders section and attributes correctly', () => {
    render(
      <Section aria-label="Feature list" data-testid="section-el">
        Section Content
      </Section>
    );
    const section = screen.getByTestId('section-el');
    expect(section).toBeInTheDocument();
    expect(section.tagName).toBe('SECTION');
    expect(section).toHaveAttribute('aria-label', 'Feature list');
  });
});
