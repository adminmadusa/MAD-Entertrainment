export interface FanSlotPosition {
  rot: number;
  scale: number;
  x: number;
  y: number;
  zIndex: number;
}

export const MAX_VISIBLE = 7;
export const HALF = 3;

export const FAN_POSITIONS: FanSlotPosition[] = [
  { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
  { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
  { rot: -7, scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
  { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
  { rot: 7, scale: 0.9346, x: 11, y: 1.3, zIndex: 3 },
  { rot: 14, scale: 0.8498, x: 22, y: 4.0, zIndex: 2 },
  { rot: 21, scale: 0.7756, x: 30, y: 7.3, zIndex: 1 },
];

export function getResponsiveMultiplier(width: number): number {
  if (width < 480) return 0.28;
  if (width < 640) return 0.38;
  if (width < 768) return 0.5;
  if (width < 1024) return 0.75;
  return 1.0;
}

export function getHeightMultiplier(width: number): number {
  let idealPx: number;
  if (width < 480) idealPx = 22 * 16; // 352px
  else if (width < 640) idealPx = 26 * 16; // 416px
  else if (width < 768) idealPx = 28 * 16; // 448px
  else if (width < 1024) idealPx = 34 * 16; // 544px
  else idealPx = 38 * 16; // 608px

  if (typeof window === 'undefined') return 1;
  const available = window.innerHeight * 0.7; // 70vh budget
  if (available >= idealPx) return 1;
  return available / idealPx;
}

export function getSlotConfig(totalCards: number, slot: number): FanSlotPosition {
  if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
  const center = totalCards >> 1;
  const distance = totalCards > 1 ? (slot - center) / center : 0;
  const absDistance = Math.abs(distance);
  return {
    rot: distance * 21,
    scale: 1.0 - 0.2244 * absDistance * absDistance,
    x: distance * 30,
    y: absDistance * absDistance * 7.3,
    zIndex: 10 - Math.abs(slot - center),
  };
}
