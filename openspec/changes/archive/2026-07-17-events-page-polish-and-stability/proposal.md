## Why

The current events listing page is showing expired events and sorting events chronologically without prioritizing live (in-progress) events. In addition, events that are in progress display a generic "Booking Closed" button, which fails to communicate the event's current active status. To fix this cleanly, we decouple event status into three independent state machines (Event Lifecycle, Booking Lifecycle, and Gallery Lifecycle), returning a clean declarative, UI-agnostic payload to the frontend, and maintaining full backward-compatibility on existing routes.

## What Changes

- Filter event queries via an optional `state` parameter (`active`, `past`, `all`), defaulting to `active`.
- Decouple the event status logic into independent concerns:
  - **Admin Status**: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
  - **Event Lifecycle**: `UPCOMING`, `LIVE`, `COMPLETED` (derived from time).
  - **Booking Lifecycle**: `OPEN`, `CLOSED` (derived from windows, inventory, manual closes).
  - **Gallery Status**: `NONE`, `DRAFT`, `PUBLISHED`.
- Expose a declarative, UI-agnostic payload containing `lifecycle`, `visibility`, `booking`, `gallery`, and `capabilities` fields.
- Restrict Admin Dashboard uploads and publishing capabilities to events with the `COMPLETED` lifecycle state.
- Expose a ranked recommended events endpoint (`GET /events?state=active&sort=recommended&exclude=<eventId>`).
- Maintain all image/video assets inside Cloudinary.

## Capabilities

### New Capabilities
- `events-page-polish`: A unified orchestrator engine `deriveEventCapabilities` in the shared package that calculates event lifecycles, booking states, galleries, and capability flags, while retaining `booking-eligibility.engine` as a compatibility wrapper.

### Modified Capabilities
<!-- No modified capability specs are present. -->
