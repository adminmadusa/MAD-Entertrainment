'use client';

import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { ImageWrapper } from '@/components/common/ImageWrapper';
import { useMounted, useWindowWidth } from '@/hooks/use-window.hook';
import type { ImageAsset } from '@mad/types';
import { ArrowLeft, ArrowRight } from '@mad/ui';

interface DjGalleryCarouselProps {
  galleryImages?: ImageAsset[];
}

export function DjGalleryCarousel({ galleryImages = [] }: DjGalleryCarouselProps) {
  const images = galleryImages;
  const mounted = useMounted();

  const [activeIndex, setActiveIndex] = useState(0);
  const windowWidth = useWindowWidth();
  const prefersReducedMotion = useReducedMotion();

  const nextSlide = () => {
    if (images.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    if (images.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
      e.preventDefault();
    }
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      nextSlide();
    } else if (info.offset.x > threshold) {
      prevSlide();
    }
  };

  const cardWidth = windowWidth < 640 ? 240 : 380;
  const cardHeight = cardWidth * (9 / 16);

  if (!mounted) {
    return (
      <div
        className="relative w-full max-w-4xl mx-auto mt-6"
        style={{ minHeight: `${240 * (9 / 16)}px` }}
        aria-hidden="true"
      />
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="glass p-5 md:p-8 rounded-3xl border border-border-subtle bg-bg-card/30 backdrop-blur-md">
      <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-border-subtle/50 pb-3 flex items-center gap-2 text-glow-neon-pink">
        <span className="w-1.5 h-6 bg-accent-pink rounded" />
        Gallery & Media
      </h2>

      <div
        className="relative w-full max-w-4xl mx-auto mt-6 focus:outline-none flex flex-col items-center"
        style={{ perspective: '1200px' }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="group"
        aria-roledescription="carousel"
        aria-label="DJ Media Gallery Carousel"
      >
        <div
          className="relative pointer-events-none flex items-center justify-center"
          style={{
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            transformStyle: 'preserve-3d',
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {images.map((img, index) => {
              const offset = index - activeIndex;
              let absoluteOffset = offset;
              if (offset > images.length / 2) absoluteOffset -= images.length;
              if (offset < -images.length / 2) absoluteOffset += images.length;

              const isActive = absoluteOffset === 0;
              const spread = windowWidth < 640 ? 110 : 180;

              const x = absoluteOffset * spread;
              const z = isActive ? 0 : -150 - Math.abs(absoluteOffset) * 60;

              let rotateY = 0;
              if (!isActive) {
                rotateY = absoluteOffset > 0 ? -25 : 25;
              }

              const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(absoluteOffset) * 0.4);
              const zIndex = 20 - Math.abs(absoluteOffset);

              if (Math.abs(absoluteOffset) > 2) return null;

              return (
                <motion.div
                  key={img.publicId || index}
                  initial={false}
                  animate={{
                    x,
                    z: prefersReducedMotion ? 0 : z,
                    rotateY: prefersReducedMotion ? 0 : rotateY,
                    opacity,
                    scale: isActive ? 1 : 0.85,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    mass: 1,
                  }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  style={{
                    zIndex,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                  }}
                  className={`pointer-events-auto group glass rounded-2xl border ${
                    isActive ? 'border-accent-pink/50 shadow-glow' : 'border-border-subtle cursor-pointer'
                  } overflow-hidden flex flex-col`}
                  onClick={() => !isActive && setActiveIndex(index)}
                >
                  <div className="w-full h-full relative overflow-hidden bg-white/5 flex-shrink-0">
                    {img.url ? (
                      <ImageWrapper
                        src={img.url}
                        alt={img.alt || `Gallery Image ${index + 1}`}
                        fill
                        priority={isActive}
                        sizes="(max-width: 768px) 100vw, 380px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent-purple/20 to-accent-pink/15 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform duration-500">
                        📸
                      </div>
                    )}
                    {!isActive && <div className="absolute inset-0 bg-black/40 transition-opacity" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {img.alt || `Live Set Glimpse ${index + 1}`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {images.length > 1 && (
          <div className="w-full relative mt-6 h-12 flex items-center justify-center">
            <button
              onClick={prevSlide}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full glass border border-border-subtle text-white hover:text-accent-pink hover:border-accent-pink/50 transition-all focus:outline-none shadow-lg pointer-events-auto"
              aria-label="Previous image"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full glass border border-border-subtle text-white hover:text-accent-pink hover:border-accent-pink/50 transition-all focus:outline-none shadow-lg pointer-events-auto"
              aria-label="Next image"
            >
              <ArrowRight size={16} />
            </button>

            <div className="flex gap-1.5 justify-center items-center">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 pointer-events-auto ${
                    idx === activeIndex
                      ? 'bg-accent-pink w-5 shadow-glow-sm'
                      : 'bg-border-subtle hover:bg-accent-pink/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
