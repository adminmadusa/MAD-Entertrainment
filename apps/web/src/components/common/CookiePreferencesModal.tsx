'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { useCookieConsent } from '@/providers/CookieConsentProvider';
import { Button, Modal } from '@mad/ui';

export function CookiePreferencesModal() {
  const { isPreferencesModalOpen, closePreferences, preferences, savePreferences, acceptAll, rejectNonEssential } = useCookieConsent();

  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    if (preferences) {
      setFunctional(preferences.functional);
      setAnalytics(preferences.analytics);
    } else {
      setFunctional(true);
      setAnalytics(true);
    }
  }, [preferences, isPreferencesModalOpen]);

  const handleSave = () => {
    savePreferences({ functional, analytics });
  };

  return (
    <Modal
      isOpen={isPreferencesModalOpen}
      onClose={closePreferences}
      size="md"
      showCloseButton={true}
      closeOnBackdropClick={true}
      ariaLabelledBy="cookie-preferences-title"
      ariaDescribedBy="cookie-preferences-description"
    >
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[11px] font-bold text-accent-purple">
            <span>🍪</span>
            <span>Privacy Controls</span>
          </div>
          <h2 id="cookie-preferences-title" className="text-xl sm:text-2xl font-black text-white">
            Cookie Preferences
          </h2>
          <p id="cookie-preferences-description" className="text-text-secondary text-xs sm:text-sm leading-relaxed">
            Customize which cookies you want to allow. Learn more in our{' '}
            <Link href="/legal/cookies" onClick={closePreferences} className="text-accent-purple hover:underline font-semibold">
              Cookie Policy
            </Link>.
          </p>
        </div>

        {/* Categories List */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {/* Strictly Necessary */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🔒</span>
                <h3 className="text-sm font-bold text-white">Strictly Necessary</h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-white/10 text-text-secondary border border-white/10 rounded-full uppercase tracking-wider">
                Always Active
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Essential for authentication, secure login sessions, CSRF protection, and ticket checkout processing. These cannot be disabled.
            </p>
          </div>

          {/* Functional & Preferences */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⚙️</span>
                <h3 className="text-sm font-bold text-white">Functional & Preferences</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-purple" />
              </label>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Remembers your interface preferences and ensures promotional banners and popups are not repeatedly displayed after dismissal.
            </p>
          </div>

          {/* Analytics & Performance */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <h3 className="text-sm font-bold text-white">Analytics & Performance</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-purple" />
              </label>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Provides aggregated, anonymized telemetry to help our engineering team identify software crashes, optimize page load speed, and enhance platform stability.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={rejectNonEssential}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 min-h-[40px]"
            >
              Reject All
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={acceptAll}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 min-h-[40px]"
            >
              Accept All
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2 text-xs font-bold rounded-xl bg-accent-purple hover:bg-accent-purple-light text-white transition-all duration-200 min-h-[40px] shadow-glow-sm"
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </Modal>
  );
}
