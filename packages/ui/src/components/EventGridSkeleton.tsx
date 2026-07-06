/**
 * @deprecated Import path — shim only.
 * This file exists for backward compatibility during Phase 2 migration.
 * It will be deleted in Phase 2.5 (v1.4.0) once all consumers have
 * migrated to the canonical import path.
 *
 * Canonical: import { Skeleton, EventGridSkeleton } from '@mad/ui';
 * (routes through src/primitives/Skeleton/index.ts)
 *
 * Note: EventGridSkeleton is preserved as a named re-export from the
 * Skeleton primitive for backward compatibility.
 *
 * Per ADR-003: this file ONLY re-exports. It does not add logic or wrappers.
 */
export * from '../primitives/Skeleton';
