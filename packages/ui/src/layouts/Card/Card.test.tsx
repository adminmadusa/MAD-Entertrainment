import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  it('renders card content and custom tag correctly', () => {
    render(
      <Card as="article" data-testid="card-element">
        Card Content
      </Card>
    );
    const card = screen.getByTestId('card-element');
    expect(card).toBeInTheDocument();
    expect(card.tagName).toBe('ARTICLE');
    expect(card).toHaveTextContent('Card Content');
  });
});
