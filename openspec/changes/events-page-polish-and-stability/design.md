## Context

To avoid patching complex UI and database logic in multiple places, we decouple event management into three distinct lifecycle concerns: Event Lifecycle, Booking Lifecycle, and Gallery Lifecycle. The backend exposes a clean declarative payload, and the frontend remains a simple display layer.

## Goals / Non-Goals

**Goals:**
- Implement `deriveEventCapabilities` in `packages/shared` as the Single Source of Truth orchestrator.
- Use MongoDB aggregation to compute sorting weight based on runtime state (Live, Upcoming, Completed).
- Decouple administrative status from runtime lifecycle (Upcoming/Live/Completed).
- Retain `booking-eligibility.engine` as a compatibility wrapper that delegates to the new orchestrator.
- Secure the backend API and frontend Admin Dashboard via capability-based authorization flags.
- Build a ranked recommended events query on the backend.
- Handle image and video assets inside Cloudinary.

**Non-Goals:**
- Adding presentation strings or UI details (e.g. colors, labels) to the API response.
- Exposing raw date checks on the frontend for rendering status badges.

## Decisions

### 1. Decoupled Lifecycle Orchestration
- **Decision**: Introduce a unified engine helper `deriveEventCapabilities(event)` in `@mad/shared/src/utils/event-engine.ts`. This orchestrator sequentially calls:
  1. `deriveEventLifecycle(event)`: Returns `UPCOMING`, `LIVE`, or `COMPLETED` based purely on start/end dates.
  2. `deriveVisibility(event)`: Returns `{ public: boolean, discoverable: boolean }` based on admin status (`DRAFT` / `PUBLISHED` / `ARCHIVED`) and deletion state.
  3. `deriveBookingState(event)`: Returns `{ status: "OPEN" | "CLOSED", reason: string }` based on booking window and inventory.
  4. `deriveGalleryState(event)`: Returns `{ status: "NONE" | "DRAFT" | "PUBLISHED", itemCount: number }`.
  5. `deriveCapabilities(event)`: Outputs authorization flags (`canBook`, `canViewGallery`, `canUploadGallery`, `canPublishGallery`).
- **Compatibility Wrapper**: Retain `booking-eligibility.engine.ts` with its existing signature, making it delegate to the new orchestration layer to prevent breaking changes for existing consumers.

### 2. MongoDB Lifecycle & Sorting Projection
- **Decision**: Update `PublicEventService.listEvents` in `apps/server/src/services/public/event.service.ts` to use a MongoDB aggregation pipeline:
  ```javascript
  const events = await Event.aggregate([
    { $match: baseFilter },
    {
      $addFields: {
        lifecycle: {
          $cond: {
            if: { $eq: ["$status", "COMPLETED"] },
            then: "COMPLETED",
            else: {
              $cond: {
                if: {
                  $and: [
                    { $lte: ["$startDate", now] },
                    { $gte: [{ $ifNull: ["$endDate", { $add: ["$startDate", 14400000] }] }, now] }
                  ]
                },
                then: "LIVE",
                else: {
                  $cond: {
                    if: { $gt: ["$startDate", now] },
                    then: "UPCOMING",
                    else: "COMPLETED"
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $addFields: {
        sortWeight: {
          $cond: { if: { $eq: ["$lifecycle", "LIVE"] }, then: 0,
          $cond: { if: { $eq: ["$lifecycle", "UPCOMING"] }, then: 1,
          then: 2 }}
        }
      }
    },
    { $sort: { sortWeight: 1, startDate: 1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
  ```

### 3. API Endpoint Parameterized Filtering & Recommendations
- **Decision**: Expose `?state=active|past|all` (defaulting to `active`) on the public `GET /events` route.
- **Decision**: Expose `?sort=recommended&exclude=<eventId>` to retrieve event recommendations ranked by:
  1. Live events.
  2. Upcoming within 7 days.
  3. Upcoming within 30 days.
  4. Everything else.

### 4. Admin Gallery Upload Security
- **Decision**: Update the Admin gallery upload endpoints `/admin/events/:eventId/gallery/items` to assert `event.lifecycle === 'COMPLETED'` before allowing changes.
- **Reasoning**: Secures the API directly using the domain model.

## Risks / Trade-offs

- **[Risk]**: Client-side timezone offsets.
  - *Mitigation*: The backend aggregates using UTC timestamps. The client uses Next.js server actions / components that serialize dates in ISO UTC format, and the browser does standard local timezone formatting in the presentation layer.
