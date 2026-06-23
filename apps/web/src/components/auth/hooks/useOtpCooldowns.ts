'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useOtpCooldowns(options?: { namespace?: string }) {
  const prefix = options?.namespace || 'mad_otp';
  const requestExpiryKey = `${prefix}_request_cooldown_expiry`;
  const verifyExpiryKey = `${prefix}_verify_cooldown_expiry`;

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
    const storedExpiry = localStorage.getItem(requestExpiryKey);
    const existingExpiry = storedExpiry ? Number(storedExpiry) : 0;
    const finalExpiry = Math.max(existingExpiry, proposedExpiry);

    localStorage.setItem(requestExpiryKey, String(finalExpiry));
    setRequestCooldownExpiry(finalExpiry);
    setRequestCooldownRemaining(Math.ceil((finalExpiry - Date.now()) / 1000));
  }, [requestExpiryKey]);

  const triggerVerifyCooldown = useCallback((retryAfterSeconds: number) => {
    const proposedExpiry = Date.now() + retryAfterSeconds * 1000;
    const storedExpiry = localStorage.getItem(verifyExpiryKey);
    const existingExpiry = storedExpiry ? Number(storedExpiry) : 0;
    const finalExpiry = Math.max(existingExpiry, proposedExpiry);

    localStorage.setItem(verifyExpiryKey, String(finalExpiry));
    setVerifyCooldownExpiry(finalExpiry);
    setVerifyCooldownRemaining(Math.ceil((finalExpiry - Date.now()) / 1000));
  }, [verifyExpiryKey]);

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
      const storedReqExpiry = localStorage.getItem(requestExpiryKey);
      if (storedReqExpiry) {
        const expiry = Number(storedReqExpiry);
        if (expiry > Date.now()) {
          setRequestCooldownExpiry(expiry);
          setRequestCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
        }
      }
      const storedVerExpiry = localStorage.getItem(verifyExpiryKey);
      if (storedVerExpiry) {
        const expiry = Number(storedVerExpiry);
        if (expiry > Date.now()) {
          setVerifyCooldownExpiry(expiry);
          setVerifyCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
        }
      }
    }
  }, [requestExpiryKey, verifyExpiryKey]);

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
        localStorage.removeItem(requestExpiryKey);
      } else {
        setRequestCooldownRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [requestCooldownExpiry, requestExpiryKey]);

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
        localStorage.removeItem(verifyExpiryKey);
      } else {
        setVerifyCooldownRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [verifyCooldownExpiry, verifyExpiryKey]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === requestExpiryKey) {
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
      if (e.key === verifyExpiryKey) {
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
  }, [requestExpiryKey, verifyExpiryKey]);

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
