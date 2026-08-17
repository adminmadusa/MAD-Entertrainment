## Why

The homepage "Relive the Magic — Past Events & Moments" section (`CompletedEventsSection`) currently renders past event cards as visual dead-ends: desaturated poster images, "Tickets Closed" text, and a `cursor-not-allowed` "Completed" button. This actively discourages users from engaging with the gallery content that is already live and fully functional behind each card. The section should feel like an invitation into beautiful event memories — not a graveyard of expired listings.

## What Changes

- Replace the "Tickets Closed / Completed" action bar with "Happy Moments / View Gallery →" on completed event cards
- Remove the `grayscale` and `cursor-not-allowed` styles so cards feel alive and clickable
- Add a photo count badge (e.g., "34 Photos") when the event has gallery items, to create FOMO and set expectations
- Add a subtle pink/gradient hover overlay instead of the current flat black overlay
- Rename the section subtitle from the generic "Past Events & Moments" label to something more evocative (e.g., a configurable label)

## Capabilities

### New Capabilities
- `completed-event-gallery-invite-card`: The revamped completed event card UI that functions as a gallery portal invite rather than a disabled ticket card

### Modified Capabilities
- None — no backend or API changes; pure frontend presentational change

## Impact

**Frontend (Web)**
- `apps/web/src/components/ui/CompletedEventsSection.tsx` — primary change
- `apps/web/src/lib/api/server.service.ts` — may need to fetch gallery photo count per event (if we show photo count badge)
- `apps/web/src/app/page.tsx` — no changes expected

**No changes to:**
- Backend API
- Database schema
- Admin dashboard
- Auth or payments
