/**
 * @deprecated Import path — shim only.
 * This file exists for backward compatibility during Phase 2 migration.
 * It will be deleted in Phase 2.5 (v1.4.0) once all consumers have
 * migrated to the canonical import path.
 *
 * Canonical: import { ArrowRight, CalendarIcon, ... } from '@mad/ui';
 * Or, preferably via the icons entry point:
 * import { ArrowRight, Calendar } from '@mad/ui/icons';
 *
 * Per ADR-003: this file ONLY re-exports. It does not add logic or wrappers.
 */
export * from '../icons';
