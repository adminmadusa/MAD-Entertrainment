'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export interface CookiePreferences {
  strictlyNecessary: true;
  functional: boolean;
  analytics: boolean;
  updatedAt: string;
}

interface CookieConsentContextValue {
  preferences: CookiePreferences | null;
  isBannerVisible: boolean;
  isPreferencesModalOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: { functional: boolean; analytics: boolean }) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const STORAGE_KEY = 'mad_cookie_consent';

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences(parsed);
        setIsBannerVisible(false);
      } else {
        // First-time visitor: check if Global Privacy Control (GPC) is broadcast by browser
        const isGpcEnabled =
          typeof navigator !== 'undefined' &&
          'globalPrivacyControl' in navigator &&
          (navigator as unknown as { globalPrivacyControl: boolean }).globalPrivacyControl === true;
        if (isGpcEnabled) {
          // If GPC is on, pre-set non-essential to false
          const gpcPrefs: CookiePreferences = {
            strictlyNecessary: true,
            functional: false,
            analytics: false,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(gpcPrefs));
          setPreferences(gpcPrefs);
          setIsBannerVisible(false);
        } else {
          setIsBannerVisible(true);
        }
      }
    } catch {
      setIsBannerVisible(true);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const allPrefs: CookiePreferences = {
      strictlyNecessary: true,
      functional: true,
      analytics: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPrefs));
    } catch {}
    setPreferences(allPrefs);
    setIsBannerVisible(false);
    setIsPreferencesModalOpen(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    const minimalPrefs: CookiePreferences = {
      strictlyNecessary: true,
      functional: false,
      analytics: false,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalPrefs));
    } catch {}
    setPreferences(minimalPrefs);
    setIsBannerVisible(false);
    setIsPreferencesModalOpen(false);
  }, []);

  const savePreferences = useCallback(({ functional, analytics }: { functional: boolean; analytics: boolean }) => {
    const customPrefs: CookiePreferences = {
      strictlyNecessary: true,
      functional,
      analytics,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPrefs));
    } catch {}
    setPreferences(customPrefs);
    setIsBannerVisible(false);
    setIsPreferencesModalOpen(false);
  }, []);

  const openPreferences = useCallback(() => {
    setIsPreferencesModalOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsPreferencesModalOpen(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      preferences,
      isBannerVisible: isInitialized && isBannerVisible,
      isPreferencesModalOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [
      preferences,
      isInitialized,
      isBannerVisible,
      isPreferencesModalOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
      closePreferences,
    ]
  );

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}
