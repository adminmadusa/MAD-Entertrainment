/**
 * @mad/ui — Public API root barrel
 *
 * This is the canonical entry point for all @mad/ui component, hook,
 * and utility imports. It is the only file exported via the "." entry
 * in package.json exports.
 */
// ─── Hooks ───────────────────────────────────────────────────────────────────
export * from './hooks/useFocusTrap';
export * from './hooks/useDelayedUnmount';
export * from './hooks/useBulkSelection';

// ─── Utilities ────────────────────────────────────────────────────────────────
export * from './lib/cn';
export * from './lib/motionTokens';

// ─── Icons ────────────────────────────────────────────────────────────────────
// Note: icons are also available as a separate entry point: @mad/ui/icons
// Prefer that entry point in new code for better tree-shaking clarity.
export * from './icons';

// ─── Phase 2B components ─────────────────────────────────────────────────────

// Primitives
export * from './primitives/Button';
export * from './primitives/IconButton';
export * from './primitives/Input';
export * from './primitives/Textarea';
export * from './primitives/Checkbox';
export * from './primitives/Label';
export * from './primitives/Badge';
export * from './primitives/Spinner';
export * from './primitives/Skeleton';
export * from './primitives/Progress';

// Composites
export * from './composites/FormField';
export * from './composites/Alert';
export * from './composites/Modal';
export * from './composites/Drawer';
export * from './composites/Tooltip';
export * from './composites/Table';
export * from './composites/Pagination';
export * from './composites/EmptyState';
export * from './composites/ErrorState';
export * from './composites/LoadingState';
export * from './composites/ScrollIndicator';
export * from './composites/AdminFormActions';
export * from './composites/Stepper';

// Layouts
export * from './layouts/Card';
export * from './layouts/Section';
export * from './layouts/Stack';
export * from './layouts/Grid';
