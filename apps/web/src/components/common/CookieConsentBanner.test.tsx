import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CookieConsentProvider } from '@/providers/CookieConsentProvider';

import { CookieConsentBanner } from './CookieConsentBanner';

describe('CookieConsentBanner and Preferences Modal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders cookie consent banner for first-time visitors', () => {
    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    expect(screen.getByText('Cookie & Privacy Preferences')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject Non-Essential/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customize/i })).toBeInTheDocument();
  });

  it('saves all preferences and hides banner when Accept All is clicked', async () => {
    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    const acceptBtn = screen.getByRole('button', { name: /Accept All/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cookie & Privacy Preferences')).not.toBeInTheDocument();
    });

    const stored = JSON.parse(localStorage.getItem('mad_cookie_consent') || '{}');
    expect(stored.strictlyNecessary).toBe(true);
    expect(stored.functional).toBe(true);
    expect(stored.analytics).toBe(true);
  });

  it('saves minimal preferences and hides banner when Reject Non-Essential is clicked', async () => {
    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    const rejectBtn = screen.getByRole('button', { name: /Reject Non-Essential/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cookie & Privacy Preferences')).not.toBeInTheDocument();
    });

    const stored = JSON.parse(localStorage.getItem('mad_cookie_consent') || '{}');
    expect(stored.strictlyNecessary).toBe(true);
    expect(stored.functional).toBe(false);
    expect(stored.analytics).toBe(false);
  });

  it('opens preferences modal when Customize is clicked and saves customized toggles', async () => {
    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    const customizeBtn = screen.getByRole('button', { name: /Customize/i });
    fireEvent.click(customizeBtn);

    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument();
    expect(screen.getByText('Strictly Necessary')).toBeInTheDocument();
    expect(screen.getByText('Functional & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Analytics & Performance')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
    });
  });
});
