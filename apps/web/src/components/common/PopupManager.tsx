'use client';

import { useQuery } from '@tanstack/react-query';
import { ImageWrapper } from '@/components/common/ImageWrapper';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { publicGetActivePopups } from '@/lib/api/public.service';
import { useAuthModal } from '@/providers/AuthModalProvider';
import { POPUP_SESSION_KEY_PREFIX, PopupTrigger } from '@mad/shared';
import type { PopupCampaign } from '@mad/types';
import { Modal } from '@mad/ui';

import { FloatingCountdown } from './FloatingCountdown';

// ─── Route Allow-List ─────────────────────────────────────────
// Only these marketing pages may display popup campaigns.
// This is an additive gate — it does NOT change the semantics of an
// empty showOnPages[] array (which still means "all eligible pages").
// Adding new marketing routes here makes them eligible automatically.
export const POPUP_ELIGIBLE_PREFIXES = ['/', '/events'];

function isEligibleRoute(pathname: string): boolean {
  return POPUP_ELIGIBLE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      (prefix !== '/' && pathname.startsWith(prefix + '/'))
  );
}

// ─── Helper — cooldown check ──────────────────────────────────

function isCooledDown(popup: PopupCampaign): boolean {
  if (typeof window === 'undefined') return false;
  const key = `${POPUP_SESSION_KEY_PREFIX}${popup._id}`;
  const lastShown = localStorage.getItem(key);
  if (!lastShown) return true;
  const elapsedHours = (Date.now() - Number(lastShown)) / (1000 * 60 * 60);
  return elapsedHours >= (popup.cooldownHours ?? 24);
}

function markShown(popup: PopupCampaign) {
  if (typeof window === 'undefined') return;
  const key = `${POPUP_SESSION_KEY_PREFIX}${popup._id}`;
  localStorage.setItem(key, String(Date.now()));
}

// ─── Single Popup Modal ───────────────────────────────────────

interface PopupModalProps {
  popup: PopupCampaign;
  onClose: () => void;
}

function PopupModal({ popup, onClose }: PopupModalProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy={`popup-title-${popup._id}`}
      className="glass border border-accent-purple/30 overflow-hidden shadow-glow p-0"
    >
      {/* Header — close button always above image, never overlapping */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Promotion</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close promotion"
          className="flex items-center justify-center w-11 h-11 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Banner image — full bleed, below header */}
      {popup.image?.url && (
        <div className="relative w-full aspect-[16/7] overflow-hidden">
          <ImageWrapper
            src={popup.image.url}
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, 448px"
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <h2
          id={`popup-title-${popup._id}`}
          className="text-white font-black text-xl mb-2"
        >
          {popup.title}
        </h2>

        {popup.description && (
          <p className="text-text-secondary text-sm leading-relaxed mb-5">
            {popup.description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {popup.ctaUrl && (
            <Link
              href={popup.ctaUrl}
              id={`popup-cta-${popup._id}`}
              className="flex-1 text-center px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent-purple transition-all"
              onClick={onClose}
            >
              {popup.ctaText || 'Book Now'}
            </Link>
          )}
          <Link
            href="/events"
            className="flex-1 text-center px-6 py-3 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            onClick={onClose}
          >
            Browse Events
          </Link>
        </div>
      </div>
    </Modal>
  );
}

// ─── Popup Manager — resolves which popup to show ─────────────

export function PopupManager() {
  const [activePopup, setActivePopup] = useState<PopupCampaign | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { isOpen: isAuthOpen } = useAuthModal();

  const currentPathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const routeEligible = isEligibleRoute(currentPathname);

  // Skip fetch entirely on ineligible routes (checkout, login, tickets, etc.)
  // to avoid unnecessary API calls on transactional pages.
  const { data: popups } = useQuery({
    queryKey: ['active-popups'],
    queryFn: publicGetActivePopups,
    staleTime: 1000 * 60 * 10, // 10 min
    enabled: routeEligible,
  });

  useEffect(() => {
    if (
      !popups ||
      popups.length === 0 ||
      dismissed ||
      activePopup ||
      !routeEligible ||
      isAuthOpen  // suppress while login modal is open
    ) {
      return;
    }

    const pathname = window.location.pathname;

    // Pick the first cooled-down popup (already sorted by priority from server).
    // Backward-compat: empty showOnPages[] = show on all eligible marketing pages.
    // A campaign must pass the route-level allow-list AND its own showOnPages filter.
    const candidate = popups.find(
      (p) =>
        isCooledDown(p) &&
        (
          !p.showOnPages || p.showOnPages.length === 0
            ? true // empty = all eligible routes (backward-compat; route gate already applied)
            : p.showOnPages.some((page) => pathname.startsWith(page))
        )
    );

    if (!candidate) return;

    // Trigger logic
    if (candidate.trigger === PopupTrigger.ON_LOAD) {
      const delay = candidate.triggerDelay ?? 1500;
      const timer = setTimeout(() => setActivePopup(candidate), delay);
      return () => clearTimeout(timer);
    }

    if (candidate.trigger === PopupTrigger.AFTER_DELAY) {
      const delay = candidate.triggerDelay ?? 5000;
      const timer = setTimeout(() => setActivePopup(candidate), delay);
      return () => clearTimeout(timer);
    }

    if (candidate.trigger === PopupTrigger.ON_SCROLL) {
      const handleScroll = () => {
        if (window.scrollY > window.innerHeight * 0.4) {
          setActivePopup(candidate);
          window.removeEventListener('scroll', handleScroll);
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }

    if (candidate.trigger === PopupTrigger.ON_EXIT) {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          setActivePopup(candidate);
          document.removeEventListener('mouseleave', handleMouseLeave);
        }
      };
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, [popups, dismissed, activePopup, routeEligible, isAuthOpen]);

  const handleClose = useCallback(() => {
    if (activePopup) markShown(activePopup);
    setActivePopup(null);
    setDismissed(true);
  }, [activePopup]);

  if (!activePopup) return null;

  const isCountdown = activePopup.linkedEvent?.showCountdown || activePopup.endDate;

  if (isCountdown) {
    return <FloatingCountdown popup={activePopup} onClose={handleClose} />;
  }

  return <PopupModal popup={activePopup} onClose={handleClose} />;
}
