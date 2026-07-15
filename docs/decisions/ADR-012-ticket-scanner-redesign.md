# ADR-012: Ticket Scanner Redesign Architecture

## Metadata
- **Status**: Accepted
- **Date**: 2026-07-06
- **Owner**: Architecture Review Board
- **Authors**: Antigravity AI
- **Reviewers**: Repository Governance Owner
- **Decision Category**: Architecture / UI / Security / API / Governance
- **Related Documents**: [ARCHITECTURE.md](../../ARCHITECTURE.md), [AGENTS.MD](../../AGENTS.MD)
- **Related GitHub Issues**: #502
- **Related Pull Requests**: None

---

## Context
The current Ticket Scanner page (`apps/admin/src/app/scanner/page.tsx`) is a minimal prototype. It requires manual input or physical hardware scanner simulation, lacks camera-based QR code decoding, provides minimal statistics, does not maintain local operator audit history, and does not capture security check-in contexts on the backend. Event staff require a fast, mobile-friendly camera-based validation scanner that degrades gracefully, supports offline operations, aggregates statistics, and records compliance audits.

---

## Problem Statement
Redesigning the Ticket Scanner introduces complexity around:
1. **Repository Hygiene**: Monolithic layout expansion risks violating file size constraints (components <= 300 lines).
2. **Duplication Risk**: Business logic, ticket validation rules, and check-in constraints could be duplicated on the frontend or across separate scanner endpoints.
3. **Cross-Platform Camera & Capability Decoupling**: Accessing camera media streams across diverse desktop, laptop, and mobile environments involves distinct permissions, failures, and torch/switching capabilities.
4. **Offline Resilience**: State synchronization and metrics must operate seamlessly without internet connectivity while maintaining a single source of truth.

---

## Decision
We establish a clean, decoupled architecture for the Ticket Scanner Redesign built on the principle of **Extension Before Creation**.

```text
               [ ScannerPage ] (Orchestrator)
              /               \
       [ ScannerCamera ]      [ ScannerStats ]  [ ScanHistory ]
              |
     [ useHtml5QrScanner ] (Camera Stream Hook)
              |
       [ html5-qrcode ]
```

### 1. Component Boundaries & Responsibilities
To maintain file size governance, responsibilities are strictly separated:
- **`ScannerPage` (`apps/admin/src/app/scanner/page.tsx`)**: Coordinator layout only (Target: 80-120 lines). Renders subcomponents and connects state.
- **`useScannerState` (`apps/admin/src/hooks/useScannerState.ts`)**: State machine coordinator (Target: 220-280 lines). Owns active state, mutations, optimistic updates, offline queue caching, and sync.
- **`useHtml5QrScanner` (`apps/admin/src/hooks/useHtml5QrScanner.ts`)**: Custom hook managing the camera stream, permissions, device selections, and scanner instance initialization (Target: 180-250 lines).
- **`ScannerCamera` (`apps/admin/src/components/scanner/ScannerCamera.tsx`)**: Renders camera stream container, permission fallbacks, device switches, and torch controls (Target: 150-220 lines).
- **`ScannerStats` (`apps/admin/src/components/scanner/ScannerStats.tsx`)**: Renders statistics widgets (Target: 80-120 lines). Pure presentation.
- **`ScanHistory` (`apps/admin/src/components/scanner/ScanHistory.tsx`)**: Lists recent scan history with filters (Target: 180-250 lines).
- **`TicketValidationModal` (`apps/admin/src/components/scanner/TicketValidationModal.tsx`)**: Standardized success/error feedback (Target: 120-180 lines).

### 2. Service Ownership Matrix

| Responsibility | Owner | Description |
| :--- | :--- | :--- |
| Camera access | `useHtml5QrScanner` | Handles MediaDevices permissions and library init |
| Camera UI | `ScannerCamera` | Controls camera layout, switching, and torch toggle |
| Scanner state | `useScannerState` | Manages operational state machine and query dispatches |
| API communication | `scanner.api.ts` | Frontend client routes mapping |
| HTTP orchestration | `scanner.controller.ts` | Request schema validation and service execution |
| Ticket validation | Existing Ticket Validation Service | Central validation rules on model schemas |
| Ticket check-in | Existing Check-in Service | Atomically marks ticket check-in and database updates |
| Offline persistence | `offline-scanner.service` | IndexedDB persistent queue database |
| Audit persistence | `AuditLog` | Persists log attempts to Mongoose collections |
| Statistics API | Backend aggregation endpoint | Aggregates event tickets state dynamically |
| History API | Backend history endpoint | Returns event scan history query results |
| DTO mapping | `scanner.api.ts` | Translates raw JSON to versioned contracts |
| UI rendering | `ScannerPage` + presentation | Modular presentation layouts |

### 3. Extended Scanner State Machine
The scanner coordinates UI views utilizing a unified state machine:
`Idle` ➔ `CameraInitializing` ➔ `Scanning` ➔ `Processing` ➔ `Success` | `Duplicate` | `Invalid` | `OfflineQueued` | `Syncing` | `Error` | `PermissionDenied` | `NoCamera` | `CameraUnavailable` | `Paused` | `Offline` | `SyncFailed`.

### 4. API Contract & DTO Abstraction Layer (V1)
All backend API responses are sanitized and adapted into the canonical validation contract:
```ts
export type ValidationStatus = 'SUCCESS' | 'ALREADY_SCANNED' | 'INVALID' | 'EXPIRED' | 'WRONG_EVENT' | 'OFFLINE_QUEUED' | 'ERROR';

export interface ValidationResult {
  status: ValidationStatus;
  ticketId: string;
  tierName?: string;
  admits?: number;
  message?: string;
  scannedAt?: string;
  attendeeEmail?: string;
}
```

### 5. Cross-Platform Camera Support & Capability Detection
- **Selection**: Availabilities are queried with `navigator.mediaDevices.enumerateDevices()`. Active selectors appear if multiple webcams/cameras are available. Last selected devices persist in browser `localStorage`.
- **Capability Checks**: Verifies `MediaDevices` API presence, secure context environment (HTTPS/localhost), and gracefully falls back to keyboard emulation or gallery upload on failure.
- **Mobile vs. Laptop**: Environment-facing default configuration on mobile devices. Friendly names (e.g. Logitech Brio) listed on laptops/desktops.

### 6. Repository Integration & Reuse
- **No Duplicate Business Logic**: The controller (`scanner.controller.ts`) strictly orchestrates the existing validation and check-in domain services on the backend.
- **Idempotency**: All validation calls integrate with the repository's existing idempotency and replay protection architecture.
- **Offline persistence**: `offline-scanner.service` remains the sole owner of IndexedDB records.
- **Append-only Audit Logs**: Every success/failure scan attempt writes to the existing `AuditLog` infrastructure mapping unique metadata (operator, device, scan source). Audit records are append-only.
- **Statistics & History**: Derived from tickets dynamically to prevent multi-source drift. Stats and history routes are read-only. Invalidation uses the shared React Query client.

## Alternatives Considered
- **Option A: Native Mobile scanner App**: Rejected because of high deployment friction across volunteer scan operators.
- **Option B: Standard keyboard QR entry**: Too slow and error-prone for real-time gate entry operations.

## Consequences
- **Pros**: Zero install web portal, cross-device compatibility, camera permission safety.
- **Cons**: Requires secure HTTPS context to request media devices.

---

## Technical & Operational Impact

### Migration Strategy
Existing physical keyboard scanning pages will be completely replaced. Backward-compatibility is preserved by routing keyboard emulator scanner submissions through the normalized manual entry validation pipeline.

### Security Impact
- Camera permission states are fully isolated.
- QR payloads are treated as untrusted input and validated server-side.
- Scan operations enforce existing admin authentication and RBAC checks (`AdminRole.SCANNER` and above).

### Performance Impact
- `html5-qrcode` dynamic loading reduces initial bundle footprint.
- Statistics metrics use dynamic index lookups (`ticketSchema.index({ eventId: 1, scannedAt: 1 })`) for sub-second responses.

### Testing Strategy
- Unit tests verify the statistics and history controller endpoints.
- Integration tests assert correct transitions of the extended state machine.
- Verification checks ensure `html5-qrcode` is only imported within `useHtml5QrScanner`.

### Rollback Strategy
If critical device failures occur, reverting commits to restore the legacy `ScannerPage` is supported, retaining database consistency since the underlying schemas and domain services are extended rather than replaced.

### Operational Impact
Allows real-time gate metrics scanning monitoring and volunteer check-in support.

---

## Future Considerations
If multiple concurrent scanner devices overload the database, query aggregation for statistics could be cached in Redis with a write-through invalidation strategy.

## References
- [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
