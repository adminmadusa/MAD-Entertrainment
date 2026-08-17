## 1. Audit & Preparation

- [x] 1.1 Confirm `Event` type has a `galleryCount` field by checking `packages/types` — document if present or absent
- [x] 1.2 Confirm the `serverGetCompletedEvents()` function in `server.service.ts` returns enough fields to support `galleryCount`
- [x] 1.3 Confirm the existing empty state on `/events/[slug]/gallery` handles zero-photo events gracefully

## 2. CompletedEventsSection Card Revamp

- [x] 2.1 Change the card `href` from `/events/${event.slug}` to `/events/${event.slug}/gallery`
- [x] 2.2 Update `aria-label` from "View recap for completed event [title]" to "View Happy Moments gallery for [title]"
- [x] 2.3 Remove the `grayscale-[30%]` resting state from the banner image (keep the hover transition from grayscale-[0%] → no change, or a subtle scale)
- [x] 2.4 Replace the action bar content: remove "Tickets Closed" label and disabled "Completed" button
- [x] 2.5 Add new action bar: left label "Happy Moments" (accent-pink), right button "View Gallery →" (accent-pink styled, fully clickable)
- [x] 2.6 Add conditional photo count badge in the image overlay: show "N Photos" badge if `event.galleryCount > 0`
- [x] 2.7 Update the "Ended" badge styling — keep it but soften it (e.g., use a camera icon or adjust opacity)

## 3. Verification

- [x] 3.1 Run `pnpm run type-check` — zero TypeScript errors
- [x] 3.2 Run `pnpm run lint` — zero lint warnings
- [x] 3.3 Run `pnpm run build` — successful build
- [x] 3.4 Verify on mobile (375px): cards display correctly, no horizontal scroll
- [x] 3.5 Verify on tablet (768px): grid layout remains 2-column
- [x] 3.6 Verify on desktop (1440px): grid is 3-column and cards look polished
- [x] 3.7 Click a completed event card on homepage and confirm it navigates to the gallery page
