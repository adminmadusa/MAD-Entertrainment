## Why

The Event Overview description disclosure button and dialog drawer contain several visual and accessibility issues identified in Forensic Audit v1.5.0:
- **EO-A11Y-001 (Contrast)**: Subtext labels use `text-text-muted` which fails the WCAG AA minimum 4.5:1 ratio on dark card backgrounds.
- **EO-A11Y-002 (Disclosure relationships)**: The "Read more" trigger opens a side dialog drawer but lacks the ARIA disclosure attributes to announce expansion state or target relationships.
- **EO-A11Y-003 (Drawer controls)**: The shared `Drawer` component lacks support for custom container IDs, reduced motion preferences, and automatic focus restoration on close.
- **EO-UI-001 (Touch Targets)**: The read-more trigger button height falls below the WCAG AA 44px tap target constraint.
- **EO-UX-001 (Body Scrolling)**: The body remains scrollable in the background while the drawer is active, leading to layout shifts and scroll loop disorientation.

## What Changes

- Upgrade Organizer subtext contrast to `text-text-secondary` (#9CA3AF) on the Event Overview card.
- Add `aria-expanded`, `aria-haspopup="dialog"`, and `aria-controls` to the disclosure button.
- Ensure the button satisfies the WCAG AA minimum 44x44px target size without layout hierarchy shifts.
- Centralize body scroll-locking inside the shared `Drawer` component using a `lockScroll` prop (enabled by default).
- Support automatic keyboard focus restoration on close and custom IDs in the `Drawer` component.
- Respect the user's `prefers-reduced-motion` preference by adding `motion-reduce:transition-none` to drawer style transitions.

## Capabilities

### New Capabilities
<!-- No new capabilities. -->

### Modified Capabilities
<!-- No modified capabilities. -->
