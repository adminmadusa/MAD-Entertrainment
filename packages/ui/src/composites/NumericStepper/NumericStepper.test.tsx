import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NumericStepper } from './NumericStepper';

describe('NumericStepper Component', () => {
  it('renders initial value and buttons correctly', () => {
    render(<NumericStepper value={2} onChange={vi.fn()} min={1} max={5} label="Tickets" />);

    expect(screen.getByRole('spinbutton')).toHaveValue('2');
    expect(screen.getByRole('button', { name: /Decrease Tickets/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Increase Tickets/i })).toBeEnabled();
  });

  it('increments value within max bounds on + click', () => {
    const onChange = vi.fn();
    render(<NumericStepper value={2} onChange={onChange} min={1} max={5} label="Tickets" />);

    fireEvent.click(screen.getByRole('button', { name: /Increase Tickets/i }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('decrements value within min bounds on - click', () => {
    const onChange = vi.fn();
    render(<NumericStepper value={2} onChange={onChange} min={1} max={5} label="Tickets" />);

    fireEvent.click(screen.getByRole('button', { name: /Decrease Tickets/i }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('disables decrement button when at minimum bound', () => {
    render(<NumericStepper value={1} onChange={vi.fn()} min={1} max={5} label="Tickets" />);

    expect(screen.getByRole('button', { name: /Decrease Tickets/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Increase Tickets/i })).toBeEnabled();
  });

  it('disables increment button when at maximum bound', () => {
    render(<NumericStepper value={5} onChange={vi.fn()} min={1} max={5} label="Tickets" />);

    expect(screen.getByRole('button', { name: /Increase Tickets/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Decrease Tickets/i })).toBeEnabled();
  });
});
