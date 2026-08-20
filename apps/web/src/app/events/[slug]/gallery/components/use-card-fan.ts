'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import type { EventGalleryItem } from '@mad/types';
import {
  MAX_VISIBLE,
  HALF,
  getResponsiveMultiplier,
  getHeightMultiplier,
  getSlotConfig,
} from './card-fan.utils';

export function useCardFan(items: EventGalleryItem[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const hasEnteredRef = useRef(false);
  const directionRef = useRef<'left' | 'right' | null>(null);
  const prevVisibleRef = useRef<Set<number>>(new Set());

  const totalCards = items.length;
  const needsPagination = totalCards > MAX_VISIBLE;
  const [centerIndex, setCenterIndex] = useState(needsPagination ? HALF : totalCards >> 1);

  const getVisibleMap = useCallback(
    (center: number) => {
      const map = new Map<number, number>();
      if (!needsPagination) {
        items.forEach((_, i) => map.set(i, i));
        return map;
      }
      for (let slot = 0; slot < MAX_VISIBLE; slot++) {
        map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
      }
      return map;
    },
    [totalCards, needsPagination, items]
  );

  const cycle = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimatingRef.current || !needsPagination) return;
      isAnimatingRef.current = true;
      directionRef.current = direction;
      setCenterIndex((prev) =>
        direction === 'right' ? (prev + 1) % totalCards : (prev - 1 + totalCards) % totalCards
      );
    },
    [totalCards, needsPagination]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !totalCards) return;

    const cardElements = Array.from(container.querySelectorAll<HTMLElement>('.fan-card'));
    if (!cardElements.length) return;

    const visibleMap = getVisibleMap(centerIndex);
    const previouslyVisible = prevVisibleRef.current;
    const direction = directionRef.current;
    const isFirstMount = !hasEnteredRef.current;
    const multiplier = getResponsiveMultiplier(window.innerWidth);
    const hMult = getHeightMultiplier(window.innerWidth);
    const slotCount = needsPagination ? MAX_VISIBLE : totalCards;
    const config = (slot: number) => getSlotConfig(slotCount, slot);

    if (isFirstMount) isAnimatingRef.current = true;

    let completedCount = 0;
    const visibleCount = visibleMap.size;
    const onCardDone = () => {
      completedCount++;
      if (completedCount >= visibleCount) {
        isAnimatingRef.current = false;
        if (isFirstMount) hasEnteredRef.current = true;
      }
    };

    cardElements.forEach((card, cardIndex) => {
      const slot = visibleMap.get(cardIndex);
      const wasVisible = previouslyVisible.has(cardIndex);

      if (slot !== undefined) {
        const { x, y, rot, scale, zIndex } = config(slot);
        const target = {
          x: `${x * multiplier}rem`,
          y: `${y * hMult}rem`,
          rotation: rot,
          scale,
          opacity: 1,
          zIndex,
        };

        if (isFirstMount) {
          gsap.set(card, { x: 0, y: `${12 * hMult}rem`, rotation: 0, scale: 0.5, opacity: 0 });
          gsap.to(card, {
            ...target,
            duration: 1.2,
            ease: 'elastic.out(1.05,.78)',
            delay: 0.2 + slot * 0.06,
            onComplete: onCardDone,
          });
        } else if (!wasVisible) {
          const enterX = direction === 'right' ? 40 : -40;
          gsap.set(card, {
            x: `${enterX}rem`,
            y: `${y * hMult}rem`,
            rotation: direction === 'right' ? 30 : -30,
            scale: 0.5,
            opacity: 0,
          });
          gsap.to(card, { ...target, duration: 0.6, ease: 'power2.out', onComplete: onCardDone });
        } else {
          gsap.to(card, { ...target, duration: 0.5, ease: 'power2.out', onComplete: onCardDone });
        }
      } else if (wasVisible) {
        const exitX = direction === 'right' ? -40 : 40;
        gsap.to(card, {
          x: `${exitX}rem`,
          opacity: 0,
          scale: 0.5,
          rotation: direction === 'right' ? -30 : 30,
          duration: 0.4,
          ease: 'power2.in',
          zIndex: 0,
        });
      } else if (isFirstMount) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });

    prevVisibleRef.current = new Set(visibleMap.keys());

    // Hover push physics
    const visibleEntries: { el: HTMLElement; slot: number }[] = [];
    cardElements.forEach((el, i) => {
      const slot = visibleMap.get(i);
      if (slot !== undefined) visibleEntries.push({ el, slot });
    });
    visibleEntries.sort((a, b) => a.slot - b.slot);

    let activeSlot: number | null = null;
    let leaveTimer: NodeJS.Timeout | null = null;
    const centerSlot = visibleEntries.length >> 1;

    const updateHoverLayout = (hoveredSlot: number | null) => {
      const mult = getResponsiveMultiplier(window.innerWidth);
      const hM = getHeightMultiplier(window.innerWidth);

      visibleEntries.forEach(({ el, slot }) => {
        const base = config(slot);
        let targetX = base.x * mult;
        let targetY = base.y * hM;
        let targetRot = base.rot;
        let targetScale = base.scale;
        let delay = 0;

        if (hoveredSlot !== null) {
          const distance = Math.abs(slot - hoveredSlot);
          delay = distance * 0.02;

          if (slot === hoveredSlot) {
            targetY -= 2.5 * hM;
            targetScale *= 1.08;
          } else {
            const normalized = centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
            const pushStrength = 8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));

            if (slot < hoveredSlot) {
              targetX -= pushStrength * mult;
              targetRot -= 3 / (distance + 1);
            } else {
              targetX += pushStrength * mult;
              targetRot += 3 / (distance + 1);
            }

            if (slot === visibleEntries.length - 1 && hoveredSlot < centerSlot) targetY -= 1 * hM;
            if (slot === 0 && hoveredSlot > centerSlot) targetY -= 1 * hM;
          }
        } else {
          delay = Math.abs(slot - centerSlot) * 0.02;
        }

        gsap.to(el, {
          x: `${targetX}rem`,
          y: `${targetY}rem`,
          rotation: targetRot,
          scale: targetScale,
          duration: 0.5,
          delay,
          ease: 'elastic.out(1,.75)',
          overwrite: 'auto',
        });
        gsap.set(el, { zIndex: base.zIndex });
      });
    };

    const enterHandlers = visibleEntries.map(({ el, slot }) => {
      const handler = () => {
        if (isAnimatingRef.current) return;
        if (leaveTimer) {
          clearTimeout(leaveTimer);
          leaveTimer = null;
        }
        if (activeSlot !== slot) {
          activeSlot = slot;
          updateHoverLayout(slot);
        }
      };
      el.addEventListener('mouseenter', handler);
      return { el, handler };
    });

    const onMouseLeave = () => {
      if (isAnimatingRef.current) return;
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        activeSlot = null;
        updateHoverLayout(null);
      }, 50);
    };
    container.addEventListener('mouseleave', onMouseLeave);

    const onResize = () => {
      if (!isAnimatingRef.current) updateHoverLayout(activeSlot);
    };
    window.addEventListener('resize', onResize);

    return () => {
      enterHandlers.forEach(({ el, handler }) => el.removeEventListener('mouseenter', handler));
      container.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [centerIndex, totalCards, getVisibleMap, needsPagination]);

  return {
    containerRef,
    centerIndex,
    cycle,
    needsPagination,
    totalCards,
  };
}
