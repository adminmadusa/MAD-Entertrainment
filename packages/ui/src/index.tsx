/**
 * @mad/ui — Public API root barrel
 *
 * This is the canonical entry point for all @mad/ui component, hook,
 * and utility imports. It is the only file exported via the "." entry
 * in package.json exports.
 *
 * ─── Existing exports (preserved for backward compatibility) ─────────────────
 * These route through backward-compat shims in src/components/ which forward
 * to canonical locations in primitives/, composites/, and layouts/.
 * Shims are removed in Phase 2.5 (v1.4.0).
 */

// ─── Backward-compat component shims ─────────────────────────────────────────
// Shim files in src/components/ are re-export only — per ADR-003.
export * from './components/Button';
export * from './components/EventGridSkeleton';
export * from './components/FormField';
export * from './components/Table';
export * from './components/ScrollIndicator';
export * from './components/Icons';
export * from './components/Modal';

// ─── Hooks ───────────────────────────────────────────────────────────────────
export * from './hooks/useFocusTrap';

// ─── Utilities ────────────────────────────────────────────────────────────────
export * from './lib/cn';

// ─── Icons ────────────────────────────────────────────────────────────────────
// Note: icons are also available as a separate entry point: @mad/ui/icons
// Prefer that entry point in new code for better tree-shaking clarity.
export * from './icons';

// ─── Phase 2B groups (populated in v1.3.0) ───────────────────────────────────
// Primitives: Button, IconButton, Input, Textarea, Label, Badge, Spinner, Skeleton, Progress
// Composites: FormField, Alert, Modal, Drawer, Tooltip, Table, EmptyState, ErrorState, LoadingState
// Layouts: Card, Section, Stack, Grid
