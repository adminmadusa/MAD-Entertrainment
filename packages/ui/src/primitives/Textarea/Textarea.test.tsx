import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from './Textarea';

describe('Textarea Component', () => {
  it('renders correctly with default placeholder', () => {
    render(<Textarea placeholder="Bio information" />);
    expect(screen.getByPlaceholderText('Bio information')).toBeInTheDocument();
  });

  it('renders error message and alert role', () => {
    render(<Textarea id="bio" error="Bio is too short" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Bio is too short');
  });

  it('shows character counter when requested and maxLength is set', () => {
    render(<Textarea showCharacterCount maxLength={100} defaultValue="hello" />);
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('updates character count on input change', () => {
    render(<Textarea showCharacterCount maxLength={100} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'testing character count update' } });
    expect(screen.getByText('30/100')).toBeInTheDocument();
  });
});
