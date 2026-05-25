'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function NotFound() {
  const [bpm, setBpm] = useState(128);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [eqHeights, setEqHeights] = useState<number[]>([40, 20, 60, 30, 80, 50, 70, 45, 90, 35]);

  // Animate Equalizer bars when "playing" the beat
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setEqHeights(Array.from({ length: 10 }, () => Math.floor(Math.random() * 80) + 10));
        // Slightly wobble BPM in sync with beat
        setBpm((prev) => {
          const shift = Math.random() > 0.5 ? 1 : -1;
          const next = prev + shift;
          return next >= 126 && next <= 130 ? next : prev;
        });
      }, 150);
    } else {
      setEqHeights([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* ─── Ambient Glow Blobs ────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-10 left-1/4 w-[350px] h-[350px] bg-accent-pink/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-accent-cyan/5 rounded-full blur-[100px]" />
      </div>

      {/* ─── Grid Backdrop ────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124, 58, 237, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ─── Main Content Container ─────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8 pb-16">
        
        {/* Left Side: Creative DJ Console illustration */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-6 flex flex-col items-center justify-center"
        >
          <div className="relative group max-w-md w-full aspect-square rounded-3xl overflow-hidden border border-border-subtle shadow-glow-hover transition-all duration-300">
            <Image
              src="/images/dj_turntables_404.png"
              alt="Neon DJ Equipment Lost in Sound"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
            {/* Cinematic Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
            
            {/* Vinyl record overlay status */}
            <div className="absolute top-6 left-6 px-3 py-1.5 glass border border-white/10 rounded-full text-[10px] text-accent-cyan font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-accent-cyan animate-spin' : 'bg-text-muted'} transition-colors`} />
              {isPlaying ? 'Deck Loaded - 128 BPM' : 'Deck Paused'}
            </div>
          </div>
        </motion.div>

        {/* Right Side: Copy & Interactive Equipment Controls */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-6 space-y-6 text-center lg:text-left"
        >
          {/* Error Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 glass border border-accent-pink/30 rounded-full text-accent-pink text-xs font-semibold uppercase tracking-widest">
            🛑 Status 404 // Lost in the Mix
          </div>

          <h1 className="text-display-sm font-black text-white leading-tight">
            The Beat Has <span className="text-gradient">Dropped.</span>
          </h1>

          <p className="text-text-secondary text-base leading-relaxed">
            Looks like the DJ pulled the fader and you got lost in the crowd. The track you are searching for is no longer in the playlist. Let's get you back to the main stage.
          </p>

          {/* ─── Interactive DJ Dashboard Widget ────────────────────── */}
          <div className="glass rounded-2xl border border-border-subtle p-5 space-y-4 text-left max-w-md mx-auto lg:mx-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Channel Monitor</span>
                <span className="text-white text-xs font-semibold font-mono">LOST_SIGNAL_404</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Speed</span>
                <span className="text-accent-cyan font-mono text-xs font-bold block">{bpm} BPM</span>
              </div>
            </div>

            {/* Simulated Live Equalizer Wave */}
            <div className="h-14 bg-background-card rounded-xl border border-border-subtle/50 flex items-end justify-center gap-1.5 px-4 overflow-hidden relative">
              {eqHeights.map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: `${h}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className={`w-2.5 rounded-t-sm ${
                    isPlaying 
                      ? 'bg-gradient-to-t from-accent-purple to-accent-pink' 
                      : 'bg-text-muted/20'
                  } transition-colors`}
                  style={{ height: '20%' }}
                />
              ))}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Tap play to drop the beat</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 pt-1">
              {/* Play button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? 'bg-accent-pink text-white shadow-glow' 
                    : 'bg-white/5 border border-border-subtle text-white hover:bg-white/10'
                }`}
              >
                {isPlaying ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    Pause Deck
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Play Track
                  </>
                )}
              </button>

              {/* Volume Slider */}
              <div className="flex flex-col flex-1 gap-1.5">
                <div className="flex justify-between text-[8px] font-mono text-text-muted uppercase tracking-wider font-bold">
                  <span>Fader Volume</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-accent-purple cursor-pointer bg-background rounded-lg appearance-none h-1.5"
                />
              </div>
            </div>
          </div>

          {/* ─── Navigation Links ─────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center lg:justify-start">
            <Link href="/" className="px-6 py-3.5 bg-gradient-hero text-white text-sm font-bold rounded-xl border border-accent-purple/40 hover:border-accent-purple transition-all shadow-glow text-center">
              Return to Main Stage
            </Link>
            <Link href="/events" className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-border-subtle text-white text-sm font-semibold rounded-xl transition-all text-center">
              Browse Live Concerts
            </Link>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}
