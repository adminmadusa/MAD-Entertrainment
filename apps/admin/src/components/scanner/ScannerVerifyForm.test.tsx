import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScannerVerifyForm } from './ScannerVerifyForm';

describe('ScannerVerifyForm Component & Smart Prefix Helper', () => {
  const currentYear = new Date().getFullYear();
  const defaultPrefix = `TKT-MAD-${currentYear}-`;

  it('renders the visual prefix badge and input field', () => {
    const onSubmit = vi.fn();
    const onBackToScan = vi.fn();

    render(
      <ScannerVerifyForm
        scannerState="Idle"
        onSubmit={onSubmit}
        onBackToScan={onBackToScan}
      />
    );

    expect(screen.getByText(defaultPrefix)).toBeTruthy();
    expect(screen.getByPlaceholderText(/e.g. X7Y8Z-001/i)).toBeTruthy();
  });

  it('automatically prepends the default prefix when entering a short code', () => {
    const onSubmit = vi.fn();
    const onBackToScan = vi.fn();

    render(
      <ScannerVerifyForm
        scannerState="Idle"
        onSubmit={onSubmit}
        onBackToScan={onBackToScan}
      />
    );

    const input = screen.getByPlaceholderText(/e.g. X7Y8Z-001/i);
    fireEvent.change(input, { target: { value: 'X7Y8Z-001' } });

    const submitBtn = screen.getByRole('button', { name: /Verify & Check In/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(`${defaultPrefix}X7Y8Z-001`);
  });

  it('does not double prefix when a full TKT- code is pasted', () => {
    const onSubmit = vi.fn();
    const onBackToScan = vi.fn();

    render(
      <ScannerVerifyForm
        scannerState="Idle"
        onSubmit={onSubmit}
        onBackToScan={onBackToScan}
      />
    );

    const input = screen.getByPlaceholderText(/e.g. X7Y8Z-001/i);
    fireEvent.change(input, { target: { value: 'TKT-MAD-2026-X7Y8Z-001' } });

    const submitBtn = screen.getByRole('button', { name: /Verify & Check In/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith('TKT-MAD-2026-X7Y8Z-001');
  });
});
