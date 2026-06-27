'use client';

import { PopupTrigger, POPUP_SESSION_KEY_PREFIX } from '@mad/shared';
import { PopupCampaign } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import { useFocusTrap } from '@mad/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { publicGetActivePopups } from '@/lib/api/public.service';


import { FloatingCountdown } from './FloatingCountdown';

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
  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: true,
    onClose,
  });

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`popup-title-${popup._id}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md glass rounded-2xl border border-accent-purple/30 overflow-hidden shadow-glow animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close popup"
          className="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Banner image */}
        {popup.image?.url && (
          <div className="relative w-full aspect-[16/7] overflow-hidden">
            <Image
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
      </div>
    </div>
  );
}

// ─── Popup Manager — resolves which popup to show ─────────────

export function PopupManager() {
  const [activePopup, setActivePopup] = useState<PopupCampaign | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const { data: popups } = useQuery({
    queryKey: ['active-popups'],
    queryFn: publicGetActivePopups,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  useEffect(() => {
    if (
      !popups ||
      popups.length === 0 ||
      dismissed ||
      activePopup
    ) {
      return;
    }

    // Pick the first cooled-down popup (already sorted by priority from server)
    const candidate = popups.find(
      (p) =>
        isCooledDown(p) &&
        // Page filter — show if no page restriction or current path matches
        (!p.showOnPages || p.showOnPages.length === 0 ||
          p.showOnPages.some((page) => window.location.pathname.startsWith(page)))
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
  }, [popups, dismissed, activePopup]);

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
