'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useOtpCooldowns() {
  const [requestCooldownRemaining, setRequestCooldownRemaining] = useState<number>(0);
  const [requestCooldownExpiry, setRequestCooldownExpiry] = useState<number | null>(null);

  const [verifyCooldownRemaining, setVerifyCooldownRemaining] = useState<number>(0);
  const [verifyCooldownExpiry, setVerifyCooldownExpiry] = useState<number | null>(null);

  // Countdown timer state for code resending
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const triggerRequestCooldown = useCallback((retryAfterSeconds: number) => {
    const proposedExpiry = Date.now() + retryAfterSeconds * 1000;
    const storedExpiry = localStorage.getItem('mad_otp_request_cooldown_expiry');
    const existingExpiry = storedExpiry ? Number(storedExpiry) : 0;
    const finalExpiry = Math.max(existingExpiry, proposedExpiry);

    localStorage.setItem('mad_otp_request_cooldown_expiry', String(finalExpiry));
    setRequestCooldownExpiry(finalExpiry);
    setRequestCooldownRemaining(Math.ceil((finalExpiry - Date.now()) / 1000));
  }, []);

  const triggerVerifyCooldown = useCallback((retryAfterSeconds: number) => {
    const proposedExpiry = Date.now() + retryAfterSeconds * 1000;
    const storedExpiry = localStorage.getItem('mad_otp_verify_cooldown_expiry');
    const existingExpiry = storedExpiry ? Number(storedExpiry) : 0;
    const finalExpiry = Math.max(existingExpiry, proposedExpiry);

    localStorage.setItem('mad_otp_verify_cooldown_expiry', String(finalExpiry));
    setVerifyCooldownExpiry(finalExpiry);
    setVerifyCooldownRemaining(Math.ceil((finalExpiry - Date.now()) / 1000));
  }, []);

  const startTimer = useCallback(() => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Hydrate on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedReqExpiry = localStorage.getItem('mad_otp_request_cooldown_expiry');
      if (storedReqExpiry) {
        const expiry = Number(storedReqExpiry);
        if (expiry > Date.now()) {
          setRequestCooldownExpiry(expiry);
          setRequestCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
        }
      }
      const storedVerExpiry = localStorage.getItem('mad_otp_verify_cooldown_expiry');
      if (storedVerExpiry) {
        const expiry = Number(storedVerExpiry);
        if (expiry > Date.now()) {
          setVerifyCooldownExpiry(expiry);
          setVerifyCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
        }
      }
    }
  }, []);

  // Set interval timer for request cooldown
  useEffect(() => {
    if (!requestCooldownExpiry) {
      setRequestCooldownRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.ceil((requestCooldownExpiry - Date.now()) / 1000);
      if (remaining <= 0) {
        setRequestCooldownRemaining(0);
        setRequestCooldownExpiry(null);
        localStorage.removeItem('mad_otp_request_cooldown_expiry');
      } else {
        setRequestCooldownRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [requestCooldownExpiry]);

  // Set interval timer for verify cooldown
  useEffect(() => {
    if (!verifyCooldownExpiry) {
      setVerifyCooldownRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.ceil((verifyCooldownExpiry - Date.now()) / 1000);
      if (remaining <= 0) {
        setVerifyCooldownRemaining(0);
        setVerifyCooldownExpiry(null);
        localStorage.removeItem('mad_otp_verify_cooldown_expiry');
      } else {
        setVerifyCooldownRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [verifyCooldownExpiry]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mad_otp_request_cooldown_expiry') {
        if (e.newValue) {
          const expiry = Number(e.newValue);
          if (expiry > Date.now()) {
            setRequestCooldownExpiry(expiry);
            setRequestCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
          } else {
            setRequestCooldownExpiry(null);
            setRequestCooldownRemaining(0);
          }
        } else {
          setRequestCooldownExpiry(null);
          setRequestCooldownRemaining(0);
        }
      }
      if (e.key === 'mad_otp_verify_cooldown_expiry') {
        if (e.newValue) {
          const expiry = Number(e.newValue);
          if (expiry > Date.now()) {
            setVerifyCooldownExpiry(expiry);
            setVerifyCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
          } else {
            setVerifyCooldownExpiry(null);
            setVerifyCooldownRemaining(0);
          }
        } else {
          setVerifyCooldownExpiry(null);
          setVerifyCooldownRemaining(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    requestCooldownRemaining,
    requestCooldownExpiry,
    verifyCooldownRemaining,
    verifyCooldownExpiry,
    resendTimer,
    formatTime,
    triggerRequestCooldown,
    triggerVerifyCooldown,
    startTimer,
  };
}
