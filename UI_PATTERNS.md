# UI Patterns

| Field | Value |
|-------|-------|
| **Standard** | UI-PAT-001 |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A |
| **Review Frequency** | Quarterly |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md) |
| **Related Standards** | [COMPONENT_GUIDELINES.md](COMPONENT_GUIDELINES.md), [RESPONSIVE_GUIDELINES.md](RESPONSIVE_GUIDELINES.md), [INTERACTION_GUIDELINES.md](INTERACTION_GUIDELINES.md) |

---

## Authority

This document is subordinate to [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md).

If any rule here conflicts with `UI_UX_GOVERNANCE.md`, that document takes precedence.

---

## Purpose

Define standardized layout patterns for recurring page types in the MAD Entertrainment platform. Using these patterns ensures consistency across the application, reduces implementation time, and prevents ad-hoc layout invention.

Before building any of these page types, implement the approved pattern. Deviations require Engineering Lead approval.

---

## 1. Dashboard Pattern

### Structure

```
┌─────────────────────────────────────────┐
│  Page Header                            │
│  Title + Description + Primary Action   │
├─────────────────────────────────────────┤
│  KPI Cards (Summary Metrics Row)        │
│  [Total] [Active] [Revenue] [Pending]   │
├─────────────────────────────────────────┤
│  Status Indicators / Alerts             │
├─────────────────────────────────────────┤
│  Primary Data Table or Chart            │
│  [Search] [Filter] [Sort] [Export]      │
├─────────────────────────────────────────┤
│  Secondary Content / Recent Activity    │
└─────────────────────────────────────────┘
```

### Rules

- KPI cards must always appear above the primary data table — never below.
- KPI cards must show: label, value, trend indicator (up/down %), and comparison period.
- Maximum 4 KPI cards in the primary row. Additional metrics belong in a secondary section.
- Primary action must be in the page header, not buried below the table.
- Dashboard must not require scrolling to see the KPI cards on desktop.

### Mobile Adaptation

- KPI cards: 2×2 grid.
- Table: card-list view with essential columns only.
- Filters: collapsible filter drawer.

---

## 2. Data Table Pattern

### Structure

```
┌─────────────────────────────────────────┐
│  Table Header                           │
│  [Search Input] [Filter] [Sort] [Bulk]  │
├─────────────────────────────────────────┤
│  Column Headers (sortable)              │
├─────────────────────────────────────────┤
│  Row 1                                  │
│  Row 2                                  │
│  Row 3  (loading: skeleton rows)        │
│  Row N                                  │
├─────────────────────────────────────────┤
│  Pagination                             │
│  [← Prev]  Page 1 of 12  [Next →]      │
│  Showing 1–25 of 293 results            │
└─────────────────────────────────────────┘
```

### Rules

- All tables must include search, at minimum.
- Column headers that support sorting must show sort direction indicator.
- Table must show total result count and current page range.
- Pagination: default 25 rows per page; options: 10, 25, 50, 100.
- Row actions (Edit, Delete, View) must be in the last column, right-aligned.
- Bulk actions appear only when rows are selected; they replace the header action row.
- Empty state: friendly illustration + "No results found" + clear-filters action.
- Loading state: skeleton rows matching the table column layout.

### Mobile Adaptation

- Horizontal scroll within `overflow-x: auto` container, **or**
- Card-list alternative where each row becomes a card showing key fields.
- Always offer a card-list fallback for mobile — do not force horizontal scroll as the only option.

---

## 3. Form Pattern

### Structure

```
┌─────────────────────────────────────────┐
│  Page / Section Header                  │
│  Title + Description                    │
├─────────────────────────────────────────┤
│  [Optional: Summary Error Alert]        │
├─────────────────────────────────────────┤
│  Form Section 1 — Basic Info            │
│  Label                                  │
│  Input                                  │
│  [Helper text]   [Error message]        │
│                                         │
│  Label                                  │
│  Input                                  │
├─────────────────────────────────────────┤
│  Form Section 2 — Details               │
│  ...                                    │
├─────────────────────────────────────────┤
│  [Cancel]  [Save / Submit]              │
└─────────────────────────────────────────┘
```

### Rules

- Forms must validate inline — show field errors as the user blurs each field.
- Show a summary error alert at the top if the form is submitted with errors.
- Group related fields under labeled sections.
- Cancel and Submit buttons must be adjacent, at the bottom of the form.
- Submit button shows loading state while async submission is in progress.
- Form must preserve entered data if a network error occurs.
- Required fields: mark with asterisk (*) and explain convention above the form.

### Mobile Adaptation

- Single column layout (never multi-column on xs/sm).
- Full-width inputs and buttons.
- Numeric keyboards for numeric fields (`inputMode="numeric"`).
- Auto-scroll to first error on submission.

---

## 4. Scanner Pattern (MAD-Specific)

### Structure

```
┌─────────────────────────────────────────┐
│  Event Name + Date                      │
├─────────────────────────────────────────┤
│  Stats Row                              │
│  Total: 250  Scanned: 30  Failed: 2    │
│  Remaining: 218                         │
├─────────────────────────────────────────┤
│  Tabs: [Scan] [Scanned] [Failed]        │
├─────────────────────────────────────────┤
│  [SCAN TAB]                             │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │      Camera Viewfinder          │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  Manual QR Entry: [Input] [Submit]      │
│  Last Scan Result: [Status]             │
└─────────────────────────────────────────┘
```

### Rules

- Stats row must always be visible above the tabs — it is the primary dashboard for the scanner operator.
- Camera viewfinder must occupy at least 60% of the viewport height on mobile.
- Manual QR entry field must always be available as a fallback.
- Last scan result (success/fail) must be visually prominent and include ticket holder name.
- Scan result must auto-dismiss after 3 seconds, ready for next scan.
- [Scanned] tab shows the chronological scan history (most recent first).
- [Failed] tab shows failed scan attempts with reason codes.

### Mobile Adaptation

- Scanner is primarily a mobile-first interface — design for mobile before any other viewport.
- No horizontal scroll.
- Large touch targets for all controls (minimum 56px height).

---

## 5. Dialog Pattern

### Small Confirmation Dialog

```
┌───────────────────────────────┐
│  Dialog Title                 │
│                               │
│  Dialog body text explaining  │
│  the action and consequences. │
│                               │
│  [Cancel]      [Confirm]      │
└───────────────────────────────┘
```

### Large Content Dialog

```
┌──────────────────────────────────────┐
│  Dialog Title               [✕ Close]│
├──────────────────────────────────────┤
│                                      │
│  Dialog Body Content                 │
│  (form, detail view, etc.)           │
│                                      │
├──────────────────────────────────────┤
│  [Secondary Action]   [Primary CTA]  │
└──────────────────────────────────────┘
```

### Rules

- Dialogs must be centered on desktop (max-width: 600px for small, 800px for large).
- On mobile, dialogs must become full-screen drawers (bottom sheet or side sheet).
- Always include a visible close button (✕) in the top-right corner.
- Focus must be trapped within the dialog while it is open.
- Pressing Escape must close the dialog.
- Destructive action dialogs: Cancel is primary position (left), Confirm is secondary (right, red).
- Non-destructive dialogs: Cancel is left, Confirm is right (brand color).

---

## 6. Settings Page Pattern

### Structure

```
┌──────────────────────────────────────────┐
│  Settings                                │
├─────────────────┬────────────────────────┤
│  [Profile]      │  Section Title         │
│  [Notifications]│                        │
│  [Security]     │  Setting row           │
│  [Billing]      │  Setting row           │
│  [Advanced]     │  Setting row           │
│                 │                        │
│                 │  [Save Changes]        │
└─────────────────┴────────────────────────┘
```

### Rules

- Settings navigation: vertical list on desktop (left sidebar), tabs on mobile.
- Each settings section must have a clear title and description.
- Changes must not auto-save unless explicitly designed for that (confirm intent with design).
- Provide a "Save Changes" button per section, not a global save.
- Unsaved changes: warn the user before navigating away.
- Destructive settings (Delete Account, Reset All Data) must be at the bottom of their section and visually separated.

### Mobile Adaptation

- Use horizontal tabs for top-level settings categories.
- Each section full-width, stacked vertically.

---

## 7. Wizard / Multi-Step Form Pattern

### Structure

```
┌─────────────────────────────────────────┐
│  Step Indicator                         │
│  [1. Details] → [2. Tickets] → [3. Review] → [4. Confirm]
├─────────────────────────────────────────┤
│  Step Title + Description               │
├─────────────────────────────────────────┤
│  Step Content (form fields)             │
│                                         │
│  [Optional: Step Summary Sidebar]       │
├─────────────────────────────────────────┤
│  [← Back]               [Next →]       │
└─────────────────────────────────────────┘
```

### Rules

- Step indicator must always show: current step, total steps, and completed steps.
- Users may navigate to completed steps (click step indicator).
- Users may not skip to future steps that haven't been completed.
- Each step must validate before allowing Next.
- Back button must preserve entered data — navigating back must not clear fields.
- Final step must be a review page showing all entered data before submission.
- Submission must show a loading state and prevent double-submission.
- Success: redirect to confirmation page, not the wizard start.

### Mobile Adaptation

- Step indicator: condensed to "Step 2 of 4" text + progress bar on mobile.
- Back/Next buttons: full-width, sticky at bottom of viewport.

---

## Change Log

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-07-07 | MAD Engineering Governance | Initial UI patterns (dashboard, table, form, scanner, dialog, settings, wizard) |
