## Context

The `CompletedEventsSection` component at `apps/web/src/components/ui/CompletedEventsSection.tsx` renders past events on the homepage. Each card currently has:
- A desaturated (`grayscale-[30%]`) banner image
- A black overlay that never lifts fully on hover
- An action bar reading "Tickets Closed" and a disabled-looking "Completed" button with `cursor-not-allowed`
- A link that already navigates to `/events/[slug]` (the event page, not directly to the gallery)

The gallery feature is already fully built: completed events have a dedicated gallery at `/events/[slug]/gallery` which auto-labels itself "Happy Moments". The only problem is the homepage card does not communicate this value to the user.

## Goals / Non-Goals

**Goals:**
- Make completed event cards feel like gallery portals — vibrant, clickable, and inviting
- Replace the "Tickets Closed / Completed" bar with a "Happy Moments / View Gallery →" action
- Enhance hover state to signal interactivity
- Optionally show a photo count badge if gallery data is available
- Keep the section heading "Relive the Magic — Past Events & Moments" unchanged (it's good)

**Non-Goals:**
- Building a new global `/happy-moments` page (future enhancement)
- Adding new backend endpoints (no API changes)
- Changing the event detail page or the gallery page itself
- Any changes to the admin dashboard

## Decisions

### Decision 1: Link directly to `/events/[slug]/gallery` instead of `/events/[slug]`
**Why**: The card is now positioned as a gallery invitation, so it should take the user directly into the gallery experience rather than making them find the gallery tab themselves.  
**Alternative considered**: Keep linking to `/events/[slug]` — rejected because it adds an extra click and reduces the FOMO impact of clicking a "View Gallery" card.

### Decision 2: Keep grayscale hover-reveal effect but remove the disabled grayscale baseline
**Why**: The hover reveal effect (`grayscale-[30%]` → `grayscale-[0%]` on hover) is actually a beautiful effect. The problem is the starting state is too grey. We keep the hover reveal but dial the resting grayscale down to `grayscale-[0%]` (fully colourful) so the card looks alive at rest.  
**Alternative**: Remove the effect entirely — rejected, the hover colour pop is a premium touch worth keeping.

### Decision 3: Show photo count only if `galleryCount > 0` — no new API call required
**Why**: The `CompletedEventsSection` receives `Event[]` from the server. The `Event` type already carries a `galleryCount` field if populated. We should use this if available rather than adding a new data-fetch layer.  
**Risk**: If `galleryCount` is not populated in the event list query, we skip the badge gracefully (no count shown, no error).

### Decision 4: Change card CTA from "Completed → disabled" to "Happy Moments → View Gallery →"
**Why**: "Completed" communicates that the event is over (negative framing). "Happy Moments / View Gallery →" communicates that there is something worth clicking on (positive framing). This is a direct driver of gallery traffic.

## Risks / Trade-offs

- **Risk: `galleryCount` not in the event list API response** → Mitigation: conditionally render the count badge only if `event.galleryCount` is truthy. No badge shown if not available — still a UX improvement.
- **Risk: Linking to `/gallery` for events with no photos** → Mitigation: the gallery page already handles the empty state gracefully with an `EmptyState` component.
- **Risk: Visual regression on mobile** → Mitigation: run responsive checks at 375px and 768px as part of verification.
