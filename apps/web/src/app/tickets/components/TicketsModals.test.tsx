import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { FindTicketsModal } from './FindTicketsModal';
import { BookingFoundModal } from './BookingFoundModal';
import { OtpVerificationModal } from './OtpVerificationModal';
import { ContactSupportModal } from './ContactSupportModal';

describe('Ticket Retrieval Modals', () => {
  it('renders FindTicketsModal with clean inline error', () => {
    render(
      <FindTicketsModal
        isOpen={true}
        onClose={vi.fn()}
        bookingRefInput=""
        setBookingRefInput={vi.fn()}
        transactionIdInput=""
        setTransactionIdInput={vi.fn()}
        isSubmitting={false}
        errorMsg="Booking reference not found"
        onSubmit={vi.fn()}
        onOpenSupport={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Booking reference not found');
  });

  it('renders BookingFoundModal with email, CTA, and Google mount callback', () => {
    const handleSendOtp = vi.fn();
    const renderGoogleButton = vi.fn();

    render(
      <BookingFoundModal
        isOpen={true}
        onClose={vi.fn()}
        onGoBack={vi.fn()}
        foundEmail="guest@example.com"
        errorMsg=""
        handleSendOtp={handleSendOtp}
        handleResendOtp={vi.fn()}
        cooldown={0}
        isSubmitting={false}
        renderGoogleButton={renderGoogleButton}
        gsiLoaded={true}
      />
    );

    expect(screen.getByText('guest@example.com')).toBeInTheDocument();
    const ctaButton = screen.getByRole('button', { name: /enter verification code/i });
    expect(ctaButton).toBeInTheDocument();

    fireEvent.click(ctaButton);
    expect(handleSendOtp).toHaveBeenCalledTimes(1);
    expect(renderGoogleButton).toHaveBeenCalled();
  });

  it('renders OtpVerificationModal with 6-digit input and inline error', () => {
    render(
      <OtpVerificationModal
        isOpen={true}
        onClose={vi.fn()}
        onGoBack={vi.fn()}
        foundEmail="guest@example.com"
        errorMsg="Invalid code provided"
        infoMsg=""
        otpInput="123456"
        setOtpInput={vi.fn()}
        isSubmitting={false}
        cooldown={30}
        onSubmit={vi.fn()}
        handleResendOtp={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid code provided');
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
  });

  it('renders ContactSupportModal with form elements and close button', () => {
    render(
      <ContactSupportModal
        isOpen={true}
        onClose={vi.fn()}
        onGoBack={vi.fn()}
        supportName=""
        setSupportName={vi.fn()}
        supportEmail=""
        setSupportEmail={vi.fn()}
        supportRef=""
        setSupportRef={vi.fn()}
        supportMessage=""
        setSupportMessage={vi.fn()}
        supportStatus="idle"
        setSupportStatus={vi.fn()}
        supportError=""
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
  });
});
