'use client';

import { Button } from '@mad/ui';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { STORAGE_VERSION } from '@mad/shared';
import { Event, Booking } from '@mad/types';
import { extractApiError } from '@/lib/api/client';
import { 
  publicGetBookingDetails, 
  publicCreatePaymentIntent, 
  publicVerifyPayment, 
  publicSaveCheckoutDetails 
} from '@/lib/api/public.service';

interface RazorpayInstance {
  open(): void;
  on(event: string, callback: (response: { error: { description: string } }) => void): void;
}

const MONTHS = [
  { name: 'January', value: '01' },
  { name: 'February', value: '02' },
  { name: 'March', value: '03' },
  { name: 'April', value: '04' },
  { name: 'May', value: '05' },
  { name: 'June', value: '06' },
  { name: 'July', value: '07' },
  { name: 'August', value: '08' },
  { name: 'September', value: '09' },
  { name: 'October', value: '10' },
  { name: 'November', value: '11' },
  { name: 'December', value: '12' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - 18 - i)); // Ages 18+ enforced

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>('razorpay');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // States for Leave Checkout Guard
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [shouldAllowNavigation, setShouldAllowNavigation] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailConfirm, setGuestEmailConfirm] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [keepUpdated, setKeepUpdated] = useState(true);
  const [sendBestEvents, setSendBestEvents] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: details, isLoading } = useQuery({
    queryKey: ['booking-checkout-details', bookingId],
    queryFn: () => {
      let sess: string | undefined;
      if (typeof window !== 'undefined') {
        const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
        sess = sessionStorage.getItem(sessionKey) || undefined;
      }
      return publicGetBookingDetails(bookingId, sess);
    },
    enabled: !!bookingId,
    retry: (failureCount, error: unknown) => {
      if ((error as { response?: { status: number } })?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const booking = details?.booking;
  const event = booking?.eventId as unknown as Event;

  // Redirect if already confirmed
  useEffect(() => {
    if (booking && booking.status === 'confirmed') {
      setShouldAllowNavigation(true);
      router.push(`/my-booking?ref=${booking.bookingId}`);
    }
  }, [booking, router]);

  // Back navigation interceptor
  useEffect(() => {
    if (shouldAllowNavigation) return;
    
    // Push dummy state to capture popstate back
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      setIsLeaveModalOpen(true);
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldAllowNavigation]);

  // Reservation Timer Countdown
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!booking?.expiresAt) return;
    const intervalId = setInterval(() => {
      const distance = new Date(booking.expiresAt).getTime() - new Date().getTime();
      if (distance <= 0) {
        clearInterval(intervalId);
        setTimeLeft('Expired');
        setIsExpired(true);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`Time left ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [booking]);

  // Save checkout details mutation
  const saveDetailsMutation = useMutation({
    mutationFn: (payload: any) => {
      let sess = '';
      if (typeof window !== 'undefined') {
        const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
        sess = sessionStorage.getItem(sessionKey) || '';
      }
      return publicSaveCheckoutDetails(bookingId, payload, sess);
    },
    onSuccess: () => {
      paymentIntentMutation.mutate(selectedGateway);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  // Payment Intent Mutation
  const paymentIntentMutation = useMutation({
    mutationFn: (gateway: 'stripe' | 'razorpay') => publicCreatePaymentIntent(bookingId, gateway),
    onSuccess: async (res) => {
      if (res.gateway === 'razorpay') {
        if (res.isMock) {
          setIsProcessing(true);
          verifyPaymentMutation.mutate({
            razorpay_order_id: res.orderId,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(2, 10),
            razorpay_signature: 'mock_signature',
          });
          return;
        }

        const loadRazorpay = () =>
          new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });

        const resLoaded = await loadRazorpay();
        if (!resLoaded) {
          setError('Failed to load Razorpay SDK. Check your connection.');
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || res.keyId,
          amount: res.amount,
          currency: res.currency,
          name: 'MAD Entertainment',
          description: `Booking ${res.bookingId}`,
          order_id: res.orderId,
          handler: function (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) {
            setIsProcessing(true);
            verifyPaymentMutation.mutate({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: function () {
              setError('Payment cancelled by user');
              setIsProcessing(false);
            },
          },
        };

        const Razorpay = (window as unknown as { Razorpay: new (options: unknown) => RazorpayInstance }).Razorpay;
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setError(`Payment Failed: ${response.error.description}`);
          setIsProcessing(false);
        });
        rzp.open();
      } else if (res.gateway === 'stripe') {
        if (res.isMock) {
          setIsProcessing(true);
          verifyPaymentMutation.mutate({
            paymentIntentId: res.clientSecret ? res.clientSecret.split('_secret')[0] : 'pi_mock_fallback',
          });
          return;
        }
        setError('Stripe production integration requires Elements. Please use Razorpay/PayPal for now.');
      }
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => publicVerifyPayment(bookingId, payload),
    onSuccess: () => {
      setShouldAllowNavigation(true);
      router.push(`/my-booking?ref=${booking?.bookingId}`);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
      setIsProcessing(false);
    },
  });

  const handlePlaceOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setError('Your booking reservation has expired. Please start a new booking.');
      return;
    }
    setError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!guestEmail.trim()) errors.guestEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errors.guestEmail = 'Invalid email format';
    
    if (guestEmailConfirm !== guestEmail) errors.guestEmailConfirm = 'Emails do not match';
    if (!guestPhone.trim()) errors.guestPhone = 'Phone number is required';
    if (!birthMonth) errors.birthMonth = 'Month is required';
    if (!birthDay) errors.birthDay = 'Day is required';
    if (!birthYear) errors.birthYear = 'Year is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const birthdateStr = `${birthYear}-${birthMonth}-${birthDay}T00:00:00.000Z`;

    saveDetailsMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestEmailConfirm: guestEmailConfirm.trim().toLowerCase(),
      guestPhone: guestPhone.trim(),
      birthdate: birthdateStr,
      keepUpdated,
      sendBestEvents,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-white/40 animate-pulse text-sm">Loading checkout...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-4 px-4">
        <div className="text-white font-bold text-lg">Booking Session Expired</div>
        <p className="text-text-muted text-sm max-w-md text-center">
          We couldn't find your booking details. It may have expired due to inactivity. Please select tickets again.
        </p>
        <Button variant="primary" onClick={() => router.push('/events')}>
          Start New Booking
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-[#0d111d] text-white relative overflow-x-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Sticky Top Checkout Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#0d111d]/90 backdrop-blur-md border-b border-white/10 py-3 z-50 shadow-md">
        <div className="container-mad max-w-4xl px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg transition-colors"
            aria-label="Go back"
          >
            ←
          </button>
          
          <div className="text-center">
            <h1 className="text-sm font-bold text-white tracking-wide">Checkout</h1>
            <div className={`text-[10px] font-semibold mt-0.5 ${isExpired ? 'text-red-400' : 'text-accent-cyan animate-pulse'}`}>
              {timeLeft}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm transition-colors"
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="container-mad max-w-4xl space-y-6 relative z-10 px-4 mt-8">

        {error && (
          <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Event summary card & Billing details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Event Summary Card */}
            {event && (
              <div className="glass rounded-2xl border border-white/5 p-4 flex gap-4 items-center">
                {event.bannerImage?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.bannerImage.url} alt={event.title} className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                )}
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-white line-clamp-1">{event.title}</h2>
                  <p className="text-xs text-text-muted">
                    {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {event.showTime}
                  </p>
                  <p className="text-xs text-accent-purple-light font-bold">₹{booking.totalAmount}</p>
                </div>
              </div>
            )}

            {/* Billing Information Form */}
            <form onSubmit={handlePlaceOrderSubmit} className="space-y-6">
              <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h2 className="text-white font-bold text-base">Billing information</h2>
                  <span className="text-[10px] text-text-muted uppercase">* Required</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary font-medium">First name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-white focus:outline-none transition-colors ${
                        fieldErrors.firstName ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                      }`}
                    />
                    {fieldErrors.firstName && <p className="text-red-400 text-[10px]">{fieldErrors.firstName}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary font-medium">Last name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-white focus:outline-none transition-colors ${
                        fieldErrors.lastName ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                      }`}
                    />
                    {fieldErrors.lastName && <p className="text-red-400 text-[10px]">{fieldErrors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium">Email address *</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-white focus:outline-none transition-colors ${
                      fieldErrors.guestEmail ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                    }`}
                  />
                  {fieldErrors.guestEmail && <p className="text-red-400 text-[10px]">{fieldErrors.guestEmail}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium">Confirm email *</label>
                  <input
                    type="email"
                    value={guestEmailConfirm}
                    onChange={(e) => setGuestEmailConfirm(e.target.value)}
                    placeholder="Confirm email address"
                    className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-white focus:outline-none transition-colors ${
                      fieldErrors.guestEmailConfirm ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                    }`}
                  />
                  {fieldErrors.guestEmailConfirm && <p className="text-red-400 text-[10px]">{fieldErrors.guestEmailConfirm}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium">Cell phone *</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-white focus:outline-none transition-colors ${
                      fieldErrors.guestPhone ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                    }`}
                  />
                  {fieldErrors.guestPhone && <p className="text-red-400 text-[10px]">{fieldErrors.guestPhone}</p>}
                </div>

                {/* Birthdate selection */}
                <div className="space-y-2">
                  <label className="text-xs text-text-secondary font-medium">Birthdate *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      className={`px-3 py-2.5 rounded-xl bg-background border text-xs text-white focus:outline-none ${
                        fieldErrors.birthMonth ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                      }`}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>

                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className={`px-3 py-2.5 rounded-xl bg-background border text-xs text-white focus:outline-none ${
                        fieldErrors.birthDay ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                      }`}
                    >
                      <option value="">Day</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className={`px-3 py-2.5 rounded-xl bg-background border text-xs text-white focus:outline-none ${
                        fieldErrors.birthYear ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                      }`}
                    >
                      <option value="">Year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {(fieldErrors.birthMonth || fieldErrors.birthDay || fieldErrors.birthYear) && (
                    <p className="text-red-400 text-[10px]">Valid birthdate is required (Age 18+)</p>
                  )}
                </div>

                {/* Subscriptions */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-text-secondary leading-relaxed">
                    <input
                      type="checkbox"
                      checked={keepUpdated}
                      onChange={(e) => setKeepUpdated(e.target.checked)}
                      className="mt-1 rounded border-white/10 bg-background accent-accent-purple"
                    />
                    <span>Keep me updated on more events and news from this event organizer.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-text-secondary leading-relaxed">
                    <input
                      type="checkbox"
                      checked={sendBestEvents}
                      onChange={(e) => setSendBestEvents(e.target.checked)}
                      className="mt-1 rounded border-white/10 bg-background accent-accent-purple"
                    />
                    <span>Send me emails about the best events happening nearby or online.</span>
                  </label>
                </div>
              </div>

              {/* Pay With / Gateways */}
              <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
                <h2 className="text-white font-bold text-base border-b border-white/10 pb-3">Pay with</h2>

                <div className="space-y-3">
                  <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedGateway === 'stripe' 
                      ? 'bg-accent-purple/10 border-accent-purple' 
                      : 'bg-white/2 border-white/5 hover:border-white/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="gateway"
                        checked={selectedGateway === 'stripe'}
                        onChange={() => setSelectedGateway('stripe')}
                        className="accent-accent-purple"
                      />
                      <span className="text-xs font-semibold text-white">Credit or debit card</span>
                    </div>
                    <span className="text-base">💳</span>
                  </label>

                  <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedGateway === 'razorpay' 
                      ? 'bg-accent-purple/10 border-accent-purple' 
                      : 'bg-white/2 border-white/5 hover:border-white/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="gateway"
                        checked={selectedGateway === 'razorpay'}
                        onChange={() => setSelectedGateway('razorpay')}
                        className="accent-accent-purple"
                      />
                      <span className="text-xs font-semibold text-white">PayPal</span>
                    </div>
                    <span className="text-xs text-accent-cyan font-bold">PayPal</span>
                  </label>

                  <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedGateway === 'razorpay' && false /* Just display third alternative */
                      ? 'bg-accent-purple/10 border-accent-purple' 
                      : 'bg-white/2 border-white/5 hover:border-white/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="gateway"
                        checked={selectedGateway === 'razorpay'}
                        onChange={() => setSelectedGateway('razorpay')}
                        className="accent-accent-purple"
                      />
                      <span className="text-xs font-semibold text-white">Google Pay</span>
                    </div>
                    <span className="text-[10px] text-white font-mono bg-white/5 px-2 py-1 rounded border border-white/10">GPay</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isExpired}
                  isLoading={saveDetailsMutation.isPending || paymentIntentMutation.isPending || isProcessing}
                  className="py-4 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black rounded-xl shadow-glow"
                >
                  Place Order
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Checkout Breakdown */}
          <div className="lg:col-span-4 glass rounded-2xl border border-white/5 p-6 space-y-6">
            <h2 className="text-white font-bold text-sm uppercase tracking-wider">Payment Details</h2>

            <div className="space-y-3 text-xs border-b border-white/5 pb-4">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>₹{booking.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Convenience Fee</span>
                <span>₹{booking.convenienceFee}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>GST (18%)</span>
                <span>₹{booking.gst}</span>
              </div>
              {booking.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span>-₹{booking.discount}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-sm font-black">
              <span className="text-white">Total Amount</span>
              <span className="text-accent-purple-light text-base">₹{booking.totalAmount}</span>
            </div>

            {/* Terms of Service notice */}
            <p className="text-[10px] text-text-muted leading-relaxed">
              By selecting Place Order, I agree to the MAD Entertainment Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Processing Loader Backdrop */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[100] space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-accent-purple border-t-transparent animate-spin" />
            <p className="text-white font-bold text-sm tracking-wider">Verifying payment with bank servers...</p>
            <p className="text-text-muted text-xs">Please do not refresh this page.</p>
          </div>
        )}
      </AnimatePresence>
      {/* Leave Checkout Confirmation Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsLeaveModalOpen(false)} />

          <div className="w-full max-w-sm bg-[#0d111d] rounded-2xl border border-white/10 p-6 space-y-6 text-center shadow-2xl relative z-10">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Leave Checkout?</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Are you sure you want to leave checkout? The items you've selected may not be available later.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-colors"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setShouldAllowNavigation(true);
                  setIsLeaveModalOpen(false);
                  setTimeout(() => {
                    router.push(`/events/${event?.slug || ''}/book`);
                  }, 50);
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-bold text-sm transition-colors shadow-glow"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
