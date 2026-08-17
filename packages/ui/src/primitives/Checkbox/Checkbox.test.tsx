/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox aria-label="Test checkbox" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders checked when checked prop is true', () => {
    render(<Checkbox aria-label="Test checkbox" checked readOnly />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('renders indeterminate state correctly', () => {
    render(<Checkbox aria-label="Test checkbox" indeterminate />);
    const checkbox = screen.getByRole('checkbox');
    // In React testing library, indeterminate is a property on the element
    expect((checkbox as HTMLInputElement).indeterminate).toBe(true);
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });

  it('toggles when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Test checkbox" onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('can be navigated via keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Test checkbox" onChange={onChange} />);

    await user.tab();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveFocus();

    await user.keyboard('[Space]');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Test checkbox" disabled onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('associates label, description, and error via aria', () => {
    render(
      <Checkbox
        label="Accept terms"
        description="You must accept before proceeding"
        error="This is required"
        required
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /accept terms/i });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAttribute('aria-required', 'true');

    // Check if aria-describedby connects to description and error
    const describedBy = checkbox.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    if (describedBy) {
      const ids = describedBy.split(' ');
      expect(ids.length).toBe(2);

      const descriptionEl = document.getElementById(ids[0]);
      expect(descriptionEl).toHaveTextContent('You must accept before proceeding');

      const errorEl = document.getElementById(ids[1]);
      expect(errorEl).toHaveTextContent('This is required');
    }
  });
});
