"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ArrowLeft } from "@mad/ui";

import { publicGetDJBySlug } from "@/lib/api/public.service";
import { useWindowWidth } from "@/hooks/use-window.hook";

// ─── SVG Icons ────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon
        points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02"
        fill="#0B0F1A"
      />
    </svg>
  );
}

function SoundCloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.56 16.52c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-6.04c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5v6.04zm2.19.5c.28 0 .5-.22.5-.5V8.98c0-.28-.22-.5-.5-.5h-.75c-.28 0-.5.22-.5.5v7.54c0 .28.22.5.5.5h.75zm2.18 0c.28 0 .5-.22.5-.5v-8.3c0-.28-.22-.5-.5-.5h-.75c-.28 0-.5.22-.5.5v8.3c0 .28.22.5.5.5h.75zm2.19-.5c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5V9.48c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5v7.04zm2.19-.75c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-4.54c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5v4.54zM2.5 13.5c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5H3c-.28 0-.5-.22-.5-.5v-2.5zm2.19-1c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-3.5zm2.19-1.5c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-5zm2.19-1c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-6z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function normalizeSocialLinks(
  socialLinks: any,
): { platform: string; url: string }[] {
  if (!socialLinks) return [];
  if (Array.isArray(socialLinks)) {
    return socialLinks
      .map((link: any) => ({
        platform: link?.platform || "",
        url: link?.url || "",
      }))
      .filter((link) => link.platform && link.url);
  }
  if (typeof socialLinks === "object") {
    return Object.entries(socialLinks)
      .map(([platform, url]) => ({
        platform,
        url: url as string,
      }))
      .filter((link) => link.platform && link.url);
  }
  return [];
}

function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  switch (p) {
    case "instagram":
      return <InstagramIcon />;
    case "twitter":
    case "x":
      return <TwitterIcon />;
    case "facebook":
      return <FacebookIcon />;
    case "youtube":
      return <YouTubeIcon />;
    case "soundcloud":
      return <SoundCloudIcon />;
    default:
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}

// ─── Gallery Carousel Component ───────────────────────────────

function GalleryCarousel({ galleryImages }: { galleryImages?: any[] }) {
  const images =
    galleryImages && galleryImages.length > 0
      ? galleryImages
      : [
          { url: "", _id: "1", title: "Live Set Glimpse 1" },
          { url: "", _id: "2", title: "Live Set Glimpse 2" },
          { url: "", _id: "3", title: "Live Set Glimpse 3" },
          { url: "", _id: "4", title: "Live Set Glimpse 4" },
          { url: "", _id: "5", title: "Live Set Glimpse 5" },
          { url: "", _id: "6", title: "Live Set Glimpse 6" },
        ];

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
    if (e.key === "ArrowLeft") {
      prevSlide();
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      nextSlide();
      e.preventDefault();
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      nextSlide();
    } else if (info.offset.x > threshold) {
      prevSlide();
    }
  };

  const cardWidth = windowWidth < 640 ? 240 : 380;
  const cardHeight = cardWidth * (9 / 16);

  return (
    <div
      className="relative w-full max-w-4xl mx-auto mt-6 focus:outline-none flex flex-col items-center"
      style={{ perspective: "1200px" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-roledescription="carousel"
      aria-label="DJ Media Gallery Carousel"
    >
      {/* Centered relative wrapper of the exact active card dimensions */}
      <div
        className="relative pointer-events-none flex items-center justify-center"
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          transformStyle: "preserve-3d",
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
            const rotateY = isActive ? 0 : absoluteOffset > 0 ? -25 : 25;
            const opacity = isActive
              ? 1
              : Math.max(0, 1 - Math.abs(absoluteOffset) * 0.4);
            const zIndex = 20 - Math.abs(absoluteOffset);

            if (Math.abs(absoluteOffset) > 2) return null;

            return (
              <motion.div
                key={img._id || index}
                initial={false}
                animate={{
                  x,
                  z: prefersReducedMotion ? 0 : z,
                  rotateY: prefersReducedMotion ? 0 : rotateY,
                  opacity,
                  scale: isActive ? 1 : 0.85,
                }}
                transition={{
                  type: "spring",
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
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                }}
                className={`pointer-events-auto group glass rounded-2xl border ${
                  isActive
                    ? "border-accent-pink/50 shadow-glow"
                    : "border-border-subtle cursor-pointer"
                } overflow-hidden flex flex-col`}
                onClick={() => !isActive && setActiveIndex(index)}
              >
                <div className="w-full h-full relative overflow-hidden bg-white/5 flex-shrink-0">
                  {img.url ? (
                    <Image
                      src={img.url}
                      alt={img.title || `Gallery Image ${index + 1}`}
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
                  {!isActive && (
                    <div className="absolute inset-0 bg-black/40 transition-opacity" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {img.title || `Live Set Glimpse ${index + 1}`}
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
                    ? "bg-accent-pink w-5 shadow-glow-sm"
                    : "bg-border-subtle hover:bg-accent-pink/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main DJDetailClient Component ───────────────────────────

export default function DJDetailClient() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    data: dj,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-dj", slug],
    queryFn: () => publicGetDJBySlug(slug),
  });

  if (isLoading) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error || !dj) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-4">DJ Not Found</h1>
        <p className="text-text-muted mb-8">
          The DJ Operator you are looking for does not exist.
        </p>
        <Link
          href="/dj-operators"
          className="btn-gradient text-white px-6 py-2 rounded-xl"
        >
          Back to DJs
        </Link>
      </div>
    );
  }

  const socialLinks = normalizeSocialLinks(dj.socialLinks);

  return (
    <div className="pt-20 min-h-screen bg-background animate-pulse-once">
      {/* Compact Premium Hero */}
      <section className="relative w-full min-h-[320px] md:min-h-[420px] py-10 md:py-16 flex items-center overflow-hidden bg-bg-card/20 border-b border-border-subtle/30">
        {dj.profileImage?.url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={dj.profileImage.url}
              alt={dj.name}
              fill
              sizes="100vw"
              className="object-cover opacity-20 scale-105 blur-[6px]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/90" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-background-secondary to-background z-0" />
        )}

        {/* Banner Details */}
        <div className="container-mad w-full relative z-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
            {/* Small Profile Image Card */}
            <div className="relative w-36 sm:w-48 lg:w-64 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-white/5 image-overlay-vignette group flex-shrink-0">
              {dj.profileImage?.url ? (
                <Image
                  src={dj.profileImage.url}
                  alt={dj.name}
                  fill
                  sizes="(max-width: 640px) 144px, (max-width: 1024px) 192px, 256px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-accent-purple text-5xl">
                  🎧
                </div>
              )}
            </div>

            {/* Info Block */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {dj.isActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shadow-glow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    AVAILABLE
                  </span>
                )}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight text-glow-neon">
                  {dj.name}
                </h1>
              </div>

              {dj.specialties && dj.specialties.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                  {dj.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light uppercase tracking-wider"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              {/* Biography in Hero */}
              {dj.bio && (
                <p className="text-text-secondary text-sm leading-relaxed max-w-2xl text-center md:text-left line-clamp-4 font-medium pt-1">
                  {dj.bio}
                </p>
              )}

              {/* Quick Action buttons */}
              <div className="hidden md:flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                <Link
                  href="/events"
                  className="px-5 py-2.5 text-xs font-bold text-white btn-gradient rounded-xl shadow-glow-sm hover:scale-105 active:scale-100 transition-transform block text-center"
                >
                  Book Tickets
                </Link>
                <a
                  href={`mailto:bookings@madentertainment.in?subject=Booking Inquiry: ${dj.name}`}
                  className="px-5 py-2.5 text-xs font-semibold text-text-primary glass border border-border-subtle hover:border-accent-purple/40 hover:bg-accent-purple/5 rounded-xl transition-all block text-center"
                >
                  Send Inquiry
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Section (Centered Single Column Layout) */}
      <section className="relative z-20 mt-8 pb-28 md:pb-20">
        <div className="container-mad">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Media Gallery Carousel */}
            <div className="glass p-5 md:p-8 rounded-3xl border border-border-subtle bg-bg-card/30 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-border-subtle/50 pb-3 flex items-center gap-2 text-glow-neon-pink">
                <span className="w-1.5 h-6 bg-accent-pink rounded" />
                Gallery & Media
              </h2>
              <GalleryCarousel galleryImages={dj.galleryImages} />
            </div>

            {/* Social Connect links */}
            {socialLinks.length > 0 && (
              <div className="glass p-5 md:p-8 rounded-3xl border border-border-subtle bg-bg-card/30 backdrop-blur-md">
                <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-border-subtle/50 pb-3 flex items-center gap-2 text-glow-neon-cyan">
                  <span className="w-1.5 h-6 bg-accent-cyan rounded" />
                  Connect
                </h2>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-text-secondary hover:text-white transition-all duration-200 border border-transparent hover:border-white/10 shadow-glow-sm hover:scale-[1.03] active:scale-100"
                    >
                      {getSocialIcon(link.platform)}
                      <span className="capitalize font-bold tracking-wide">
                        {link.platform}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Mobile Bottom Navigation Menu */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-lg border-t border-border-subtle/50 p-4 pb-6 flex gap-3 shadow-glow-sm">
        <Link
          href="/events"
          className="flex-1 py-3 text-sm font-bold text-white btn-gradient rounded-xl shadow-glow-sm active:scale-[0.98] transition-transform text-center flex items-center justify-center"
        >
          Book Tickets
        </Link>
        <a
          href={`mailto:bookings@madentertainment.in?subject=Booking Inquiry: ${dj.name}`}
          className="flex-1 py-3 text-sm font-semibold text-text-primary glass border border-border-subtle hover:border-accent-purple/40 hover:bg-accent-purple/5 rounded-xl transition-all text-center flex items-center justify-center"
        >
          Send Inquiry
        </a>
      </div>
    </div>
  );
}
