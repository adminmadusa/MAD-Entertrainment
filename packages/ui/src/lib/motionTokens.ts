/**
 * @mad/ui — Motion Tokens
 *
 * Single Source of Truth for animation timing constants used by shared
 * components. Values reference the CSS custom properties defined in
 * packages/ui/src/styles/shared.css.
 *
 * Components own their animation timing by referencing these constants.
 * The shared `useDelayedUnmount` hook accepts these as arguments —
 * never embedding magic numbers internally.
 *
 * Ownership: @mad/ui (packages/ui)
 * Consumers: Modal, Drawer, useDelayedUnmount
 */

/** Duration (ms) for enter/exit transitions — maps to `--transition-fast` (150ms) */
export const DURATION_FAST = 150;

/** Duration (ms) for enter/exit transitions — maps to `--transition-base` (250ms) */
export const DURATION_BASE = 250;

/** Duration (ms) for slower transitions — maps to `--transition-slow` (400ms) */
export const DURATION_SLOW = 400;

/**
 * Per-component motion timing constants.
 * Components import from here, never hardcode raw ms values.
 */
export const MotionTokens = {
  modal: {
    /** Duration (ms) for the modal enter animation */
    enter: DURATION_BASE,
    /** Duration (ms) for the modal exit animation */
    exit: DURATION_FAST,
  },
  drawer: {
    /** Duration (ms) for the drawer enter animation */
    enter: DURATION_BASE,
    /** Duration (ms) for the drawer exit animation */
    exit: DURATION_FAST,
  },
} as const;
