# Modal API Documentation

The `@mad/ui` Modal component is a highly accessible, responsive, and composable dialog container used across both web and admin applications.

## API Additions

### `presentation` API
```typescript
presentation?: "centered" | "bottom-sheet"
```

- **Purpose**: Defines the layout, animation, and responsive behavior of the modal. This decouples the modal's behavior from hard-coded application CSS and centralizes safe-area handling within the design system.
- **Default behavior**: `"centered"`. Existing consumers do not need to provide this prop unless they want to opt into the bottom-sheet presentation.

## Supported Presentation Modes

### 1. Centered (Default)
**When to use**: Desktop-first dialogs, critical warnings, confirmation dialogs (e.g., delete confirmation), admin forms, and popup managers.

**Behavioral Contract**:
- Default presentation.
- Standard fade and scale entry animation (`opacity-0 scale-95` to `opacity-100 scale-100`).
- Pressing `ESC` closes the modal.
- Clicking the backdrop dismisses the modal (unless intercepted or `isDirty`).
- Focus management traps focus within the modal.
- No swipe gesture support.

### 2. Bottom Sheet
**When to use**: Mobile-first touch-friendly interactions, deep multi-step flows, authentication (Login/OTP), ticketing/booking flows on small viewports.

**Behavioral Contract**:
- Mobile-first presentation (anchors to bottom, expands upward).
- Slide-up animation (`translate-y-full` to `translate-y-0`).
- Optional swipe-to-close behavior (requires `enableSwipeToClose={true}`).
- Safe-area support automatically handled for both top notch/island and bottom indicator zones.
- Keyboard behavior: Browser resizes viewport, modal respects `max-h` adjustments natively.
- Scroll ownership: Modal container fully owns scroll; swipe gesture correctly ignores downward swipes if the container is scrolled.
- Long-form content is fully supported via internal `overflow-y-auto`.

## Known Limitations

- **Swipe Gestures**: Supported only for `presentation="bottom-sheet"` and must be explicitly enabled via `enableSwipeToClose={true}`.
- **Safe Area**: Safe-area boundary support depends on browser support for CSS `env()`. Fallbacks (e.g., `max(1.5rem, ...)`) are implemented.
- **Current Migration Status**: The current implementation has only migrated the **Authentication modal**. Remaining modal migrations (e.g., Event booking, Ticket lookup) are intentionally deferred.

## Migration Roadmap

The migration of existing modals to the `bottom-sheet` API is phased. The following are future tasks and are not part of the initial implementation:

- **UI-004** — Migrate Ticket Lookup Modals (`TicketSelectionContent`, `FindTicketsModal`, `BookingFoundModal`, `ContactSupportModal`)
- **UI-005** — Migrate Event Booking Flow (`EventBookingFlow`, `BookingDetailsModal`)
- **UI-006** — Repository-wide Modal Animation Standardization
- **UI-007** — Modal Accessibility & Keyboard Audit
- **UI-008** — Remove Legacy Modal CSS Hacks

## Accessibility Expectations
- Maintains WCAG AA focus trapping.
- Retains proper ARIA roles (`dialog` or `alertdialog`).
- Retains an accessible close button (`aria-label="Close dialog"`).
