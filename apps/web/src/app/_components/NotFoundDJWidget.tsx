"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * NotFoundDJWidget — the interactive equalizer/play/volume panel on the 404 page.
 *
 * Extracted from not-found.tsx so the parent can be a server component
 * (enabling metadata export, static HTML for crawlers, and eliminating the
 * 150 ms setInterval that ran on every 404 visit even with no interaction).
 */
export function NotFoundDJWidget() {
  const [bpm, setBpm] = useState(128);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [eqHeights, setEqHeights] = useState<number[]>([
    40, 20, 60, 30, 80, 50, 70, 45, 90, 35,
  ]);

  // Animate equalizer bars only when user has pressed Play
  useEffect(() => {
    if (!isPlaying) {
      setEqHeights([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
      return;
    }
    const interval = setInterval(() => {
      setEqHeights(
        Array.from({ length: 10 }, () => Math.floor(Math.random() * 80) + 10),
      );
      setBpm((prev) => {
        const shift = Math.random() > 0.5 ? 1 : -1;
        const next = prev + shift;
        return next >= 126 && next <= 130 ? next : prev;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="glass rounded-2xl border border-border-subtle p-5 space-y-4 text-left max-w-md mx-auto lg:mx-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            Channel Monitor
          </span>
          <span className="text-white text-xs font-semibold font-mono">
            LOST_SIGNAL_404
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            Speed
          </span>
          <span
            className="text-accent-cyan font-mono text-xs font-bold block"
            aria-live="polite"
            aria-atomic="true"
          >
            {bpm} BPM
          </span>
        </div>
      </div>

      {/* Simulated Live Equalizer Wave */}
      <div
        className="h-14 bg-background-card rounded-xl border border-border-subtle/50 flex items-end justify-center gap-1.5 px-4 overflow-hidden relative"
        role="img"
        aria-label={isPlaying ? "Live equalizer animation" : "Equalizer paused"}
      >
        {eqHeights.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: `${h}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={`w-2.5 rounded-t-sm ${
              isPlaying
                ? "bg-gradient-to-t from-accent-purple to-accent-pink"
                : "bg-text-muted/20"
            } transition-colors`}
            style={{ height: "20%" }}
            aria-hidden="true"
          />
        ))}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
              Tap play to drop the beat
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? "Pause deck" : "Play track"}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isPlaying
              ? "bg-accent-pink text-white shadow-glow"
              : "bg-white/5 border border-border-subtle text-white hover:bg-white/10"
          }`}
        >
          {isPlaying ? (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause Deck
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Track
            </>
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex flex-col flex-1 gap-1.5">
          <div className="flex justify-between text-[8px] font-mono text-text-muted uppercase tracking-wider font-bold">
            <label htmlFor="fader-volume-slider" className="cursor-pointer">
              Fader Volume
            </label>
            <span aria-live="polite" aria-atomic="true">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            id="fader-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="DJ Fader Volume Mixer"
            className="w-full accent-accent-purple cursor-pointer bg-background rounded-lg appearance-none h-1.5"
          />
        </div>
      </div>
    </div>
  );
}
