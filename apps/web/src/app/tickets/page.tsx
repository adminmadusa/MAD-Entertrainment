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
    googleBtnRef,
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Accessibility Screen Reader Live Announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
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
        isSubmitting={isSubmitting}
        googleBtnRef={googleBtnRef}
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
