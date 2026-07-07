# Interaction Guidelines

| Field | Value |
|-------|-------|
| **Standard** | UI-IX-001 |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A |
| **Review Frequency** | Quarterly |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md) |
| **Related Standards** | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [ACCESSIBILITY_GUIDELINES.md](ACCESSIBILITY_GUIDELINES.md) |

---

## Authority

This document is subordinate to [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md).

If any rule here conflicts with `UI_UX_GOVERNANCE.md`, that document takes precedence.

---

## Purpose

Define how every user-facing interaction in the MAD Entertrainment platform must behave. Interaction standards ensure that the interface communicates clearly and consistently with users at every state transition — loading, success, error, empty, confirmation, and destructive actions.

---

## 1. Interaction State Matrix

Every interactive element must visually distinguish these states:

| State | Description | Required Visual Treatment |
|-------|-------------|--------------------------|
| Default | Idle, no user interaction | Standard appearance |
| Hover | Pointer over the element | Subtle background shift or border change |
| Focus | Keyboard focus active | Visible focus ring (see ACCESSIBILITY_GUIDELINES.md) |
| Active | Being pressed/clicked | Depressed or darkened appearance |
| Disabled | Not operable | Reduced opacity (≥50%) + `not-allowed` cursor |
| Loading | Async operation in progress | Spinner or skeleton; element becomes non-interactive |
| Success | Operation completed successfully | Green indicator or checkmark (brief) |
| Error | Operation failed | Red indicator + error message |

All states must be visually distinguishable without relying on color alone.

---

## 2. Loading Patterns

### Rule: Prefer Skeletons Over Spinners

| Load Duration | Recommended Pattern |
|---------------|-------------------|
| < 200ms | No loading indicator (renders fast enough) |
| 200ms – 1s | Subtle spinner or progress bar |
| > 1s | Skeleton loading screens |
| > 3s | Skeleton + progress indicator + estimated wait |

### Skeleton Loading Rules

- Skeletons must match the approximate shape and layout of the content they represent.
- Skeleton animation must respect `prefers-reduced-motion`.
- Skeletons must not shift layout when real content loads (no CLS).
- Skeleton line heights must match the actual content line height.

### Spinner Rules

- Use spinners only for short, bounded operations (< 1s).
- Spinners must have an accessible `aria-label` (e.g., `aria-label="Loading tickets"`).
- Spinners must not block interaction unless the operation prevents UI use.

### Optimistic UI

Use optimistic UI for low-risk actions where the success rate is very high:

- Toggling a preference
- Adding an item to a list

Do not use optimistic UI for:
- Payment operations
- Authentication actions
- Destructive actions
- Multi-step operations

---

## 3. Success Feedback

| Context | Pattern |
|---------|---------|
| Form submission | Toast notification + inline confirmation |
| Item saved | Toast: "Changes saved" (3s auto-dismiss) |
| Item created | Redirect to the new item or inline addition |
| Bulk action | Toast: "[N] items updated" |
| QR scan success | Audible feedback + green status indicator |

### Toast Rules

- Auto-dismiss: 3–5 seconds for non-critical success messages.
- Persistent: Required for critical confirmations (e.g., "Booking confirmed — ID: #12345").
- Accessible: Announced via `aria-live="polite"`.
- Position: Top-right (desktop), top-center (mobile).
- Maximum 1 toast visible at a time unless stacked with LIFO order.

---

## 4. Error Handling

Every asynchronous operation must handle failure.

### Error Levels

| Level | Scope | Pattern |
|-------|-------|---------|
| Field error | Single form field | Inline error message below the field |
| Form error | Entire form | Summary error alert above the form |
| Page error | Full page failed to load | Error state page with retry action |
| Network error | API request failed | Toast + retry button |
| Session error | Auth expired | Modal or redirect to login |
| Critical error | Unrecoverable system error | Full-page error boundary with support contact |

### Error Message Rules

- Error messages must explain **what went wrong** and **what the user should do**.
- Never show raw error codes or stack traces to end users.
- Error messages must be programmatically associated with their input (`aria-describedby`).
- Network errors must always offer a **Retry** action.
- Errors must persist until the user dismisses them or the condition resolves — do not auto-dismiss errors.

### Error Boundary

Every page-level and feature-level component must be wrapped in a React Error Boundary.

```tsx
// Required: wrap page content
<ErrorBoundary fallback={<PageErrorState onRetry={reload} />}>
  <PageContent />
</ErrorBoundary>
```

---

## 5. Empty States

Empty states occur when a data set has no items. They must never be blank.

### Required Elements

1. **Icon or illustration** — contextually relevant (e.g., empty calendar for no bookings).
2. **Heading** — explains what is empty in plain language.
3. **Supporting text** — explains why it might be empty and what the user can do.
4. **Primary action** — a clear call-to-action (e.g., "Create your first event").

### Empty State Copy Examples

| Context | Heading | Supporting Text | CTA |
|---------|---------|----------------|-----|
| No tickets | "No tickets yet" | "Tickets for this event will appear here once created." | "Create Ticket" |
| No bookings | "No bookings found" | "This event has no bookings matching your current filters." | "Clear Filters" |
| No scan history | "No scans recorded" | "Scanned tickets will appear here in real time." | — |

---

## 6. Confirmation Patterns

### Low-Risk Actions

No confirmation required. Provide an undo mechanism where practical.

Examples: Saving a draft, toggling a setting.

### Moderate-Risk Actions

Use a toast with an undo option (5-second window).

```
"Email sent to 250 attendees"  [Undo — 4s]
```

### High-Risk Actions (Destructive)

Require a modal confirmation dialog with:
- Clear description of what will be deleted/changed.
- A **Cancel** button (prominent).
- A **Confirm** button (destructive styling — red, labeled clearly e.g., "Delete Event").
- Do not auto-focus the confirm button — auto-focus Cancel or the dialog heading.

```
Dialog title: "Delete Event?"
Body: "This will permanently delete 'Summer Concert 2026' and all associated bookings. This action cannot be undone."
Actions: [Cancel] [Delete Event]
```

### Irreversible Actions

For actions that cannot be undone and have severe consequences (e.g., deleting all attendee data):

- Require typing confirmation text (e.g., "Type DELETE to confirm").
- Do not proceed until the typed text matches exactly.
- Log the action with timestamp, user ID, and confirmation text.

---

## 7. Animation Budget

Excessive animation degrades performance and accessibility. Apply a strict budget.

| Category | Max Duration | Easing |
|----------|-------------|--------|
| Micro-interactions (button press, checkbox) | 100ms | ease-standard |
| Hover transitions | 150ms | ease-standard |
| Element enter (fade-in, slide-in) | 200ms | ease-decelerate |
| Element exit (fade-out, slide-out) | 150ms | ease-accelerate |
| Drawer / sheet open | 300ms | ease-decelerate |
| Page transitions | 300ms | ease-standard |
| Loading skeleton pulse | 1500ms | ease-in-out (loop) |

### Animation Rules

- Animate `transform` and `opacity` only — never `width`, `height`, `top`, `left`, `padding`, or `margin`.
- All animations must respect `prefers-reduced-motion`.
- Never animate elements that are outside the viewport.
- Do not animate more than 3 elements simultaneously.
- Animation must not block interaction.

---

## 8. Notification & Toast Queue

- Maximum 3 simultaneous toasts.
- Queue additional toasts; display them after active ones dismiss.
- Critical alerts (`aria-live="assertive"`) bypass the queue and display immediately.
- Toast order: LIFO (last-in, first-out).
- Toast must be dismissible with a close button (keyboard accessible).

---

## 9. Interaction PR Checklist

```
[ ] All interactive states implemented (default, hover, focus, active, disabled, loading)
[ ] Loading pattern matches duration guideline (skeleton vs. spinner)
[ ] Success feedback implemented (toast or inline)
[ ] Error handling implemented (inline field errors + network error)
[ ] Empty state implemented with icon, text, and CTA
[ ] Destructive actions use confirmation modal
[ ] Irreversible actions require typed confirmation
[ ] Animation budget respected
[ ] prefers-reduced-motion respected
[ ] All toasts accessible via aria-live
[ ] Error messages not auto-dismissed
[ ] Error messages explain what happened and what to do
```

---

## Change Log

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-07-07 | MAD Engineering Governance | Initial interaction guidelines |
