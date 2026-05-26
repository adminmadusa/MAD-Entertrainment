'use client';

import { PopupCampaign } from '@mad/types';
import { Modal } from '@mad/ui';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { useCountdown } from '@/hooks/use-countdown.hook';


interface FloatingCountdownProps {
  popup: PopupCampaign;
  onClose: () => void;
}

export function FloatingCountdown({ popup, onClose }: FloatingCountdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // We rely on the endDate of the campaign or the linkedEvent's earlyBirdDeadline/startDate
  const targetDate = popup.endDate || popup.linkedEvent?.earlyBirdDeadline || popup.linkedEvent?.startDate;
  
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

  if (isExpired) {
    return null; // Auto-hide when expired as per requirements
  }

  // Format with leading zeros
  const formatTime = (time: number) => time.toString().padStart(2, '0');

  const collapsedWidget = (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6 w-[calc(100%-2rem)] sm:w-auto"
    >
      <div className="relative glass-strong rounded-2xl border border-accent-purple/30 p-4 shadow-glow flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors overflow-hidden" onClick={() => setIsExpanded(true)}>
        
        {/* Minimize/Close Button - Stops propagation to prevent opening modal */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(true);
            onClose(); // Notify parent to mark it shown/dismissed if needed
          }}
          className="absolute top-2 right-2 p-1 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
          aria-label="Minimize widget"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Promotional Image Thumbnail */}
        {popup.image?.url && (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 hidden sm:block border border-white/10">
            <Image src={popup.image.url} alt="" fill className="object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 pr-6">
          <p className="text-accent-purple text-xs font-bold uppercase tracking-wider mb-1">Limited Time</p>
          <h3 className="text-white font-semibold text-sm line-clamp-1">{popup.title}</h3>
          
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1 text-white text-xs font-mono font-medium">
              <span className="bg-white/10 px-1.5 py-0.5 rounded">{formatTime(days)}</span>d
              <span className="bg-white/10 px-1.5 py-0.5 rounded">{formatTime(hours)}</span>h
              <span className="bg-white/10 px-1.5 py-0.5 rounded">{formatTime(minutes)}</span>m
              <span className="bg-white/10 px-1.5 py-0.5 rounded">{formatTime(seconds)}</span>s
            </div>
          </div>
        </div>
        
        {/* Chevron */}
        <div className="text-white/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </motion.div>
  );

  const expandedModal = (
    <Modal
      isOpen={isExpanded}
      onClose={() => setIsExpanded(false)}
      size="md"
      showCloseButton={true}
    >
      <div className="flex flex-col items-center text-center -mt-2">
        {/* Banner Image */}
        {popup.image?.url && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 border border-white/10 shadow-glow-sm">
            <Image src={popup.image.url} alt="" fill className="object-cover" />
          </div>
        )}

        <h2 className="text-2xl font-black text-white mb-2">{popup.title}</h2>
        {popup.description && (
          <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">{popup.description}</p>
        )}

        {/* Large Countdown */}
        <div className="grid grid-cols-4 gap-4 w-full max-w-sm mx-auto mb-8">
          <div className="flex flex-col items-center">
            <div className="text-3xl font-mono font-bold text-white bg-white/5 border border-white/10 w-full rounded-xl py-3 shadow-inner">
              {formatTime(days)}
            </div>
            <span className="text-[10px] text-text-secondary uppercase mt-2 tracking-widest">Days</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-mono font-bold text-white bg-white/5 border border-white/10 w-full rounded-xl py-3 shadow-inner">
              {formatTime(hours)}
            </div>
            <span className="text-[10px] text-text-secondary uppercase mt-2 tracking-widest">Hours</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-mono font-bold text-white bg-white/5 border border-white/10 w-full rounded-xl py-3 shadow-inner">
              {formatTime(minutes)}
            </div>
            <span className="text-[10px] text-text-secondary uppercase mt-2 tracking-widest">Mins</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-mono font-bold text-accent-purple bg-accent-purple/10 border border-accent-purple/30 w-full rounded-xl py-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              {formatTime(seconds)}
            </div>
            <span className="text-[10px] text-text-secondary uppercase mt-2 tracking-widest">Secs</span>
          </div>
        </div>

        {/* Scarcity Message */}
        {popup.linkedEvent?.soldCount && popup.linkedEvent?.totalCapacity && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold mb-6 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Only {popup.linkedEvent.totalCapacity - popup.linkedEvent.soldCount} tickets left!
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          {popup.ctaUrl && (
            <Link
              href={popup.ctaUrl}
              className="flex-1 py-3.5 btn-gradient text-white font-bold rounded-xl shadow-glow text-center hover:scale-[1.02] transition-transform"
              onClick={() => {
                // If it's internal navigation, we let standard <a> tag behavior handle it or wrap in Link. 
                // For simplicity, standard href works for app router if we just let browser navigate, 
                // but if we used next/link it would be better. We will just close the modal.
                setIsExpanded(false);
                onClose();
              }}
            >
              {popup.ctaText || 'Book Now'}
            </Link>
          )}
          <Link
            href="/events"
            className="flex-1 py-3.5 border border-white/20 text-white font-semibold rounded-xl text-center hover:bg-white/10 transition-colors"
            onClick={() => {
              setIsExpanded(false);
              onClose();
            }}
          >
            View More Events
          </Link>
        </div>
      </div>
    </Modal>
  );

  return (
    <>
      <AnimatePresence>
        {!isMinimized && !isExpanded && collapsedWidget}
      </AnimatePresence>
      {expandedModal}
    </>
  );
}
