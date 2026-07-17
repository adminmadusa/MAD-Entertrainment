## Why

The Event Lifecycle Management portal contains several visual, accessibility, and interaction issues identified in the Forensic Audit v1.5.0:
- **E-A11Y-001 (Contrast)**: Text elements and labels use `text-text-muted` which fails the WCAG AA minimum 4.5:1 ratio on card backgrounds.
- **E-A11Y-002 (Focus rings)**: No visible outline focus rings on search and form wizard input fields.
- **E-UI-001 (Responsiveness)**: Events directory table column compression on tablet viewports due to lack of a min-width constraint.
- **E-GOV-001 (Duplication)**: Duplicated inline pagination block in the events table.
- **E-UX-001 (Double submit)**: Potential duplicate mutation dispatches on fast click sequences before button disables reactively.

## What Changes

- Upgrade contrast for all low-contrast elements from `text-text-muted` to `text-text-secondary` (#9CA3AF) in the events page.
- Add `focus:ring-2 focus:ring-accent-purple/50` to the directory search input and all form wizard inputs/textareas.
- Apply a table-specific minimum width to the events directory table to trigger horizontal scrolling on tablet viewports before columns compress.
- Integrate the shared `<TablePagination>` component after checking behavioral parity.
- Add synchronous `isSubmitting` `useRef` guards to event creator and editor form triggers.

## Capabilities

### New Capabilities
<!-- No new capabilities. -->

### Modified Capabilities
<!-- No modified capabilities. -->
