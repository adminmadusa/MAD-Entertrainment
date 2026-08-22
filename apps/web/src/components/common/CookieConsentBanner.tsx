'use client';

import React from 'react';
import Link from 'next/link';

import { useCookieConsent } from '@/providers/CookieConsentProvider';
import { Button } from '@mad/ui';

import { CookiePreferencesModal } from './CookiePreferencesModal';

export function CookieConsentBanner() {
  const { isBannerVisible, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent();

  return (
    <>
      {isBannerVisible && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 p-5 rounded-2xl bg-[#0F1424]/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in transition-all duration-300"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">🍪</span>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Cookie & Privacy Preferences
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  We use cookies to maintain your session, secure transactions, and improve site performance. You can customize your preferences anytime in our{' '}
                  <Link href="/legal/cookies" className="text-accent-purple hover:underline font-semibold">
                    Cookie Policy
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={rejectNonEssential}
                className="flex-1 min-w-[90px] px-3 py-2 text-xs font-bold rounded-xl border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 min-h-[38px]"
              >
                Reject Non-Essential
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openPreferences}
                className="flex-1 min-w-[90px] px-3 py-2 text-xs font-bold rounded-xl border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 min-h-[38px]"
              >
                Customize
              </Button>
              <Button
                type="button"
                onClick={acceptAll}
                className="w-full sm:w-auto sm:flex-1 min-w-[100px] px-4 py-2 text-xs font-bold rounded-xl bg-accent-purple hover:bg-accent-purple-light text-white transition-all min-h-[38px] shadow-glow-sm"
              >
                Accept All
              </Button>
            </div>
          </div>
        </aside>
      )}

      <CookiePreferencesModal />
    </>
  );
}
