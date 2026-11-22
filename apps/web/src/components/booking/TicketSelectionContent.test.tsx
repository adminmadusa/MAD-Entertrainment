import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Event as EventData } from '@mad/types';

import { TicketSelectionContent } from './TicketSelectionContent';
import * as publicService from '@/lib/api/public.service';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}));

const mockEvent: EventData = {
  _id: 'event-123',
  title: 'Test Concert',
  slug: 'test-concert',
  description: 'A great concert',
  venue: 'Main Arena',
  date: '2026-12-31T20:00:00.000Z',
  currency: 'USD',
  ticketTiers: [
    {
      tier: 'ga',
      name: 'General Admission',
      price: 50,
      capacity: 100,
      sold: 10,
    },
  ],
} as unknown as EventData;

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TicketSelectionContent - Session Initialization & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-TSC-001: initializes guest session successfully on mount', async () => {
    vi.spyOn(publicService, 'ensureGuestBookingSession').mockResolvedValueOnce({
      sessionId: 'sess-1',
      token: 'token-1',
    });

    renderWithQueryClient(<TicketSelectionContent event={mockEvent} isModal={true} />);

    expect(screen.getByText('General Admission')).toBeInTheDocument();
    await waitFor(() => {
      expect(publicService.ensureGuestBookingSession).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC-TSC-002: displays granular error and allows retry when session initialization fails', async () => {
    const errorWithResponse = {
      response: {
        status: 502,
        data: { message: 'Service temporarily unavailable' },
      },
      message: 'Service temporarily unavailable',
    };

    vi.spyOn(publicService, 'ensureGuestBookingSession')
      .mockRejectedValueOnce(errorWithResponse)
      .mockResolvedValueOnce({
        sessionId: 'sess-recovered',
        token: 'token-recovered',
      });

    renderWithQueryClient(<TicketSelectionContent event={mockEvent} isModal={true} />);

    await waitFor(() => {
      expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: 'Try Again' });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByText('Service temporarily unavailable')).not.toBeInTheDocument();
    });
    expect(publicService.ensureGuestBookingSession).toHaveBeenCalledTimes(2);
  });

  it('TC-TSC-003: displays friendly message when rate limit (429) occurs', async () => {
    const rateLimitError = {
      response: {
        status: 429,
        data: { message: 'Too many requests' },
      },
      message: 'Too many requests',
    };

    vi.spyOn(publicService, 'ensureGuestBookingSession').mockRejectedValueOnce(rateLimitError);

    renderWithQueryClient(<TicketSelectionContent event={mockEvent} isModal={true} />);

    await waitFor(() => {
      expect(screen.getByText('Too many requests. Please wait a moment before trying again.')).toBeInTheDocument();
    });
  });
});
