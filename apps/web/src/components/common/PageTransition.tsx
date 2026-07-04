'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// ─── Section Reveal Animation ─────────────────────────────────

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
  trigger?: 'mount' | 'scroll';
}

const directionVariants = {
  up: { y: 30, opacity: 0 },
  down: { y: -30, opacity: 0 },
  left: { x: 30, opacity: 0 },
  right: { x: -30, opacity: 0 },
};

/**
 * Section Reveal Animation using framer-motion.
 *
 * WARNING: Do NOT use this component for above-the-fold content, Hero sections,
 * or LCP (Largest Contentful Paint) candidate elements. The client-side
 * mounted-state guard triggers post-hydration layout shifts and animation
 * delays that severely impact Core Web Vitals. Use native CSS animations instead.
 */
export function Reveal({ children, delay = 0, direction = 'up', className = '', trigger = 'scroll' }: RevealProps) {
  const isScroll = trigger === 'scroll';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={directionVariants[direction]}
      animate={!isScroll ? { x: 0, y: 0, opacity: 1 } : undefined}
      whileInView={isScroll ? { x: 0, y: 0, opacity: 1 } : undefined}
      viewport={isScroll ? { once: true, margin: '-20px' } : undefined}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Container ────────────────────────────────────────

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className = '', staggerDelay = 0.08 }: StaggerProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
