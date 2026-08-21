'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { FindTicketsModal } from './components/FindTicketsModal';
import { useTicketRecoveryFlow } from './hooks/useTicketRecoveryFlow';

const BookingFoundModal = dynamic(
  () => import('./components/BookingFoundModal').then((mod) => mod.BookingFoundModal),
  { ssr: false }
);
const OtpVerificationModal = dynamic(
  () => import('./components/OtpVerificationModal').then((mod) => mod.OtpVerificationModal),
  { ssr: false }
);
const ContactSupportModal = dynamic(
  () => import('./components/ContactSupportModal').then((mod) => mod.ContactSupportModal),
  { ssr: false }
);

import { BookingCard } from '@/components/booking/shared/BookingCard';
import { useBookings } from '@/hooks/use-bookings.hook';
import { Button } from '@mad/ui';
import { AlertCircle } from '@mad/ui/icons';

function TicketRetrievalContent() {
  const {
    activeModal,
    setActiveModal,
    bookingRefInput,
    setBookingRefInput,
    transactionIdInput,
    setTransactionIdInput,
    foundEmail,
    otpInput,
    setOtpInput,
    cooldown,
    gsiLoaded,
    renderGoogleButton,
    supportName,
    setSupportName,
    supportEmail,
    setSupportEmail,
    supportRef,
    setSupportRef,
    supportMessage,
    setSupportMessage,
    supportStatus,
    setSupportStatus,
    supportError,
    isSubmitting,
    errorMsg,
    setErrorMsg,
    infoMsg,
    liveMessage,
    handleClose,
    handleLookupSubmit,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtpSubmit,
    handleSupportFormSubmit,
  } = useTicketRecoveryFlow();

  const {
    bookings,
    tickets,
    ticketsReadyMap,
    isLoading: isBookingsLoading,
    downloadingId,
    resendingId,
    resendCooldowns,
    errorMsg: bookingError,
    infoMsg: bookingInfo,
    handleDownloadPDF,
    handleResendTickets,
  } = useBookings();

  const hasSessionBookings = bookings && bookings.length > 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Accessibility Screen Reader Live Announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle/40 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary tracking-tight">
              My Tickets
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {hasSessionBookings
                ? 'Your active ticket passes and QR codes for this session.'
                : 'Lookup and retrieve your event tickets and entry passes.'}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setErrorMsg('');
              setActiveModal('find');
            }}
          >
            {hasSessionBookings ? 'Find Another Booking' : 'Find Tickets'}
          </Button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div role="alert" aria-live="assertive" className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-medium py-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {infoMsg && (
          <div role="status" aria-live="polite" className="p-3.5 bg-accent-purple/10 border border-accent-purple/30 rounded-xl text-xs text-purple-300 text-center font-medium">
            {infoMsg}
          </div>
        )}
        {bookingError && (
          <div role="alert" aria-live="assertive" className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-medium py-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{bookingError}</span>
          </div>
        )}
        {bookingInfo && (
          <div role="status" aria-live="polite" className="p-3.5 bg-accent-purple/10 border border-accent-purple/30 rounded-xl text-xs text-purple-300 text-center font-medium">
            {bookingInfo}
          </div>
        )}

        {/* Content list */}
        {isBookingsLoading && (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl glass animate-pulse border border-white/5" />
            <div className="h-48 rounded-2xl glass animate-pulse border border-white/5" />
          </div>
        )}

        {!isBookingsLoading && hasSessionBookings && (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const bookingTickets = tickets.filter(
                (t) => t.bookingId?.toString() === (booking._id?.toString() || booking.bookingId)
              );
              const isReady = !!ticketsReadyMap[booking._id?.toString() ?? ''];

              return (
                <BookingCard
                  key={booking.bookingId || booking._id}
                  booking={booking}
                  tickets={bookingTickets}
                  ticketsReady={isReady}
                  collapsible={false}
                  downloading={downloadingId === booking.bookingId}
                  resending={resendingId === booking.bookingId}
                  resendCooldown={resendCooldowns[booking.bookingId] || 0}
                  onDownload={() => handleDownloadPDF(booking.bookingId)}
                  onResend={() => handleResendTickets(booking.bookingId)}
                />
              );
            })}
          </div>
        )}

        {!isBookingsLoading && !hasSessionBookings && (
          <div className="text-center py-12 px-4 rounded-2xl glass border border-white/5 space-y-4">
            <p className="text-text-muted text-sm max-w-md mx-auto">
              No active bookings found for your current session. If you booked from another device or window, look up your tickets using your reference ID.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setErrorMsg('');
                setActiveModal('find');
              }}
            >
              Lookup Booking Reference
            </Button>
          </div>
        )}
      </div>

      <FindTicketsModal
        isOpen={activeModal === 'find'}
        onClose={handleClose}
        bookingRefInput={bookingRefInput}
        setBookingRefInput={setBookingRefInput}
        transactionIdInput={transactionIdInput}
        setTransactionIdInput={setTransactionIdInput}
        isSubmitting={isSubmitting}
        errorMsg={errorMsg}
        onSubmit={handleLookupSubmit}
        onOpenSupport={() => {
          setErrorMsg('');
          setActiveModal('support');
        }}
      />

      <BookingFoundModal
        isOpen={activeModal === 'found'}
        onClose={handleClose}
        onGoBack={() => {
          setErrorMsg('');
          setActiveModal('find');
        }}
        foundEmail={foundEmail}
        errorMsg={errorMsg}
        handleSendOtp={handleSendOtp}
        handleResendOtp={handleResendOtp}
        cooldown={cooldown}
        isSubmitting={isSubmitting}
        renderGoogleButton={renderGoogleButton}
        gsiLoaded={gsiLoaded}
      />

      <OtpVerificationModal
        isOpen={activeModal === 'otp'}
        onClose={handleClose}
        onGoBack={() => {
          setErrorMsg('');
          setActiveModal('found');
        }}
        foundEmail={foundEmail}
        errorMsg={errorMsg}
        infoMsg={infoMsg}
        otpInput={otpInput}
        setOtpInput={setOtpInput}
        isSubmitting={isSubmitting}
        cooldown={cooldown}
        onSubmit={handleVerifyOtpSubmit}
        handleResendOtp={handleResendOtp}
      />

      <ContactSupportModal
        isOpen={activeModal === 'support'}
        onClose={handleClose}
        onGoBack={() => {
          setErrorMsg('');
          setActiveModal('find');
        }}
        supportName={supportName}
        setSupportName={setSupportName}
        supportEmail={supportEmail}
        setSupportEmail={setSupportEmail}
        supportRef={supportRef}
        setSupportRef={setSupportRef}
        supportMessage={supportMessage}
        setSupportMessage={setSupportMessage}
        supportStatus={supportStatus}
        setSupportStatus={setSupportStatus}
        supportError={supportError}
        onSubmit={handleSupportFormSubmit}
      />
    </div>
  );
}

export default function TicketRetrievalPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
          <div className="text-purple-300 animate-pulse text-sm">Loading My Tickets...</div>
        </div>
      }
    >
      <TicketRetrievalContent />
    </Suspense>
  );
}
