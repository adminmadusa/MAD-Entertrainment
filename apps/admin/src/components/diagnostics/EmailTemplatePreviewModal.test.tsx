import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailTemplatePreviewModal } from './EmailTemplatePreviewModal';

vi.mock('@/lib/api/admin/diagnostics.service', () => ({
  adminGetEmailTemplates: vi.fn().mockResolvedValue([
    { id: 'booking_confirmation', name: 'Booking Confirmation & Invoice', category: 'Transaction' },
    { id: 'magic_link', name: 'Login Passcode / OTP', category: 'Authentication' },
  ]),
  adminPreviewEmailTemplate: vi.fn().mockImplementation((templateId: string) => {
    return Promise.resolve({
      templateId,
      subject: `Mock Subject for ${templateId}`,
      html: `<html><body>Mock Render for ${templateId}</body></html>`,
    });
  }),
}));

describe('EmailTemplatePreviewModal Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderComponent = (props: { isOpen: boolean; onClose: () => void }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EmailTemplatePreviewModal {...props} />
      </QueryClientProvider>
    );
  };

  it('renders modal when open with header and viewport controls', async () => {
    renderComponent({ isOpen: true, onClose: vi.fn() });

    expect(screen.getByText(/Email Template Gallery & Live Preview/i)).toBeTruthy();
    expect(screen.getByText(/Desktop/i)).toBeTruthy();
    expect(screen.getByText(/Mobile/i)).toBeTruthy();
  });

  it('switches viewport when mobile button is clicked', async () => {
    renderComponent({ isOpen: true, onClose: vi.fn() });

    const mobileBtn = screen.getByRole('button', { name: /Mobile/i });
    fireEvent.click(mobileBtn);

    expect(mobileBtn.className).toContain('bg-purple-500');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderComponent({ isOpen: true, onClose });

    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
