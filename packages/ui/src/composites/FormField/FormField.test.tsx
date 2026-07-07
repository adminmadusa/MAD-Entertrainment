import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';
import { Input } from '../../primitives/Input';

describe('FormField Component', () => {
  it('renders label and associated input correctly', () => {
    render(
      <FormField label="Username" htmlFor="username">
        <Input placeholder="Enter username" />
      </FormField>
    );
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('injects error state to input child element', () => {
    render(
      <FormField label="Username" htmlFor="username" error="Username is taken">
        <Input placeholder="Enter username" />
      </FormField>
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Username is taken');
  });
});
