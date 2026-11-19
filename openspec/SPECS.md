# OpenSpec Capability Specifications Index

- **Owner**: Technical Architecture & OpenSpec
- **Status**: Active
- **Version**: 1.0
- **Scope**: Canonical Feature & Capability Specifications

---

## Overview
This document consolidates all active OpenSpec capability specifications across the MAD Entertrainment platform into a single unified specification manual.

---

## Capability: events-page-polish

# events-page-polish Specification

## Purpose
TBD - created by archiving change events-page-polish-and-stability. Update Purpose after archive.
## Requirements
### Requirement: Decoupled Lifecycle Engine
The system SHALL compute runtime lifecycle states (`UPCOMING`, `LIVE`, `COMPLETED`) based purely on start and end times, completely decoupled from booking status and gallery publication status.

#### Scenario: Live event lifecycle evaluation
- **WHEN** the current time falls between the event's `startDate` and `endDate`
- **THEN** the system sets the event's `lifecycle` state to `LIVE`

### Requirement: Declarative API Response Structure
The system MUST return a structured, UI-agnostic payload for event details containing lifecycle, visibility, booking, gallery, and capabilities objects, keeping presentation logic decoupled from the backend.

#### Scenario: API payload validation
- **WHEN** a client fetches event details
- **THEN** the response includes `lifecycle: "LIVE"`, `visibility.discoverable: true`, `booking.status: "CLOSED"`, and `capabilities.canBook: false`

### Requirement: Gallery Action Restrictions
The system SHALL enforce gallery upload and publication restrictions in both the backend API and the Admin Dashboard client interface based directly on whether the Event Lifecycle state is `COMPLETED`.

#### Scenario: Gallery upload block
- **WHEN** an admin attempts to upload media for an event with `lifecycle` state `UPCOMING`
- **THEN** the backend API rejects the request with a `400 Bad Request` and `capabilities.canUploadGallery` resolves to `false`

### Requirement: Parameterized Filtering and Sorting Query
The `/events` API endpoint SHALL filter results based on an optional `state` parameter (`active`, `past`, `all`), defaulting to `active`, and sort results via a numeric weight projection where `LIVE` is weight 0, `UPCOMING` is weight 1, and `COMPLETED` is weight 2.

#### Scenario: Query active events
- **WHEN** a user queries events without specifying a state filter
- **THEN** the system defaults to returning only `LIVE` and `UPCOMING` events sorted by weight and nearest start date

### Requirement: Recommended Events Ranking Algorithm
The `/events` API endpoint SHALL support a `sort=recommended` parameter that ranks event recommendations in the following precedence: 1. Live events, 2. Upcoming events within 7 days, 3. Upcoming events within 30 days, 4. Other active events.

#### Scenario: Gallery recommendations
- **WHEN** loading recommendations for a past event's Happy Moments page via the `/events?state=active&sort=recommended` query
- **THEN** the list displays Live events at the top, followed by upcoming events sorted chronologically

---

## Capability: homepage-optimizations

# homepage-optimizations Specification

## Purpose
TBD - created by archiving change homepage-targeted-polish. Update Purpose after archive.
## Requirements
### Requirement: Completed Events Loading Fallback
The homepage Completed Events section SHALL use a custom loading fallback skeleton that matches the exact layout structure, grid system, card aspect ratios, and card styles of the past events recap section to eliminate layout shifts.

#### Scenario: Completed events section is in loading state
- **WHEN** the completed events data is being fetched from the server
- **THEN** the system SHALL render a grid-based placeholder skeleton containing 3 static card placeholders without call-to-action buttons, matching the completed events layout.

### Requirement: Homepage Component Code Cleanliness
The homepage components (`page.tsx`, `UpcomingEventsSection.tsx`, `CompletedEventsSection.tsx`, `HomeSkeletons.tsx`, `PageTransition.tsx`) SHALL remain free of unused imports, unused variables, unused parameters, and redundant assignments.

#### Scenario: Code analysis is run on homepage components
- **WHEN** linting, compilation, and TypeScript checks are executed
- **THEN** the checks SHALL pass with zero warnings or errors regarding unused variables, parameters, or redundant imports.

---

## Capability: mobile-navigation

# Specification: Mobile Navigation

## Purpose
Unified navigation specification for the mobile customer-facing web application.

## Requirements

### Requirement: Unified Mobile Navigation Icons
The mobile navigation bar SHALL display icons for Home, Browse Events, My Tickets, and Profile/Login that are imported from the shared design system (`@mad/ui`).

#### Scenario: Visual consistency in mobile navigation
- **WHEN** the mobile bottom navigation bar is rendered
- **THEN** the icons for Home, Browse Events, My Tickets, and Profile/Login SHALL be Lucide-react elements provided by `@mad/ui/icons`
- **AND** they SHALL inherit unified stroke width and scaling tokens

---

## Capability: pdf-ticket-layout

# Capability: PDF Ticket Layout

## Purpose
TBD

## Requirements

### Requirement: Layout engine propagates Y position across sections
The PDF layout engine SHALL propagate the ending Y coordinate from the event details section
to the attendee details section to prevent content collision on variable-height event titles.

#### Scenario: Short event title — no collision
- **WHEN** an event title occupies 1 line
- **THEN** the attendee section starts at `contentEndY + MIN_SECTION_GAP` (or `CARD_Y + 220`, whichever is greater)
- **THEN** there is no visual overlap between event detail content and attendee detail content

#### Scenario: Long event title wrapping to 4+ lines
- **WHEN** an event title wraps to 4 or more lines inside the ticket card content width
- **THEN** the attendee section is pushed downward to preserve `MIN_SECTION_GAP` spacing
- **THEN** the attendee content does not render on top of any event detail text

#### Scenario: Extremely long single word title (no spaces)
- **WHEN** the event title contains a single word of 100+ characters
- **THEN** the title is truncated to 100 characters with an ellipsis ("…") before rendering
- **THEN** no text overflows outside the card content width boundaries

### Requirement: Tier badge text does not overflow its container
The PDF header SHALL guard against tier badge text overflowing the fixed badge container width.

#### Scenario: Custom tier name exceeds badge width
- **WHEN** the computed string width of the badge text at fontSize 8 exceeds `badgeWidth - 8` points
- **THEN** the badge text is truncated with a trailing "…" to fit within the container
- **THEN** the badge background shape remains the correct fixed dimensions

### Requirement: Attendee section accepts dynamic start Y
The `drawAttendeeDetails` function SHALL accept a `startY: number` parameter and SHALL use it
as the basis for its layout position.

#### Scenario: Caller provides a startY below the hardcoded minimum
- **WHEN** the caller provides `startY` that is less than `CARD_Y + 220`
- **THEN** the function uses `CARD_Y + 220` as the effective start Y (minimum guard)

#### Scenario: Caller provides a valid dynamic startY
- **WHEN** the caller provides `startY` that is greater than `CARD_Y + 220`
- **THEN** the function uses `startY + MIN_SECTION_GAP` as the effective start Y

---

## Capability: pdf-ticket-typography

# Capability: PDF Ticket Typography

## Purpose
TBD

## Requirements

### Requirement: Custom fonts are embedded in the PDF at generation time
The PDF generator SHALL register and embed three vendored font files before any draw
calls execute. Fonts SHALL be loaded from `apps/server/src/lib/pdf/ticket/fonts/`.

#### Scenario: Fonts registered successfully at PDF creation
- **WHEN** the PDF document is instantiated in `generate-ticket-pdf.ts`
- **THEN** `doc.registerFont('Righteous', ...)`, `doc.registerFont('Inter-Regular', ...)`, and `doc.registerFont('Inter-Bold', ...)` are called before the first draw function
- **THEN** no fallback to Helvetica occurs for any text in the ticket

#### Scenario: Font file is missing from fonts directory
- **WHEN** a font TTF file is absent from the fonts directory at runtime
- **THEN** PDFKit throws a file-not-found error
- **THEN** the PDF generation worker catches the error and marks the job as failed (existing error handling)

### Requirement: Display font (Righteous) used for all brand and label text
The display font SHALL be used for: brand name, section labels, event title, and the
QR section "SCAN TO VERIFY" label.

#### Scenario: Event title uses display font
- **WHEN** the event details section is drawn
- **THEN** the event title text is rendered in the Righteous font
- **THEN** section labels ("E V E N T", "D A T E  &  T I M E", "V E N U E  &  L O C A T I O N") use the Righteous font

#### Scenario: Brand name uses display font
- **WHEN** the header section is drawn
- **THEN** "M A D" text is rendered in the Righteous font
- **THEN** "E N T E R T R A I N M E N T" is rendered in the Righteous font

### Requirement: Body font (Inter) used for all data field values
The Inter font family SHALL be used for all field values: dates, venue names, attendee
names, ticket IDs, booking references, and entry limit text.

#### Scenario: Date and venue field values use Inter Regular
- **WHEN** the event details section is drawn
- **THEN** the formatted date string is rendered in Inter-Regular
- **THEN** the venue name is rendered in Inter-Bold

#### Scenario: Attendee data fields use Inter Bold
- **WHEN** the attendee details section is drawn
- **THEN** guest name, booking reference, ticket ID, and entry limit values are rendered in Inter-Bold

### Requirement: Vendored font files are licensed for redistribution
The font files committed to the repository SHALL use the SIL Open Font License 1.1,
which permits commercial use and redistribution in both source and binary forms.

#### Scenario: License attribution file exists
- **WHEN** the `fonts/` directory is present in the repository
- **THEN** a `fonts/LICENSES.md` file exists attributing Righteous and Inter to their
  respective authors under SIL OFL 1.1

---

## Capability: pdf-ticket-visual

# Capability: PDF Ticket Visual

## Purpose
TBD

## Requirements

### Requirement: Card background uses depth gradient instead of flat fill
The ticket card SHALL be rendered with a top-to-bottom linear gradient from `#1C1917`
(top) to `#0A0A0A` (bottom) to create a perception of depth and premium material quality.

#### Scenario: Card renders with gradient
- **WHEN** a PDF ticket is generated
- **THEN** the ticket card background is a linear gradient, not a flat solid fill
- **THEN** the top of the card is visibly lighter than the bottom under close inspection

### Requirement: Tier-specific accent strip on card left edge
The ticket card SHALL render a 4pt-wide vertical accent strip on its left edge, from
`CARD_Y` to `PERFORATION_Y`, in the tier-appropriate color.

#### Scenario: VIP tier renders gold accent strip
- **WHEN** the ticket tier is "vip"
- **THEN** the left accent strip is filled with gold (`#CA8A04`)

#### Scenario: GA tier renders purple accent strip
- **WHEN** the ticket tier is "general_admission" or "ga"
- **THEN** the left accent strip is filled with deep purple (`#8B5CF6`)

#### Scenario: Custom tier renders brand red accent strip
- **WHEN** the ticket tier is any value other than "vip", "general_admission", or "ga"
- **THEN** the left accent strip is filled with brand red (`#EF4444`)

### Requirement: Stub zone is visually distinct from main card body
The ticket stub zone (from `PERFORATION_Y` to card bottom) SHALL have a distinct
background fill of `#0F0F0F` to differentiate it from the main card body (`#0A0A0A`–`#1C1917`).

#### Scenario: Stub zone renders with distinct background
- **WHEN** a PDF ticket is generated
- **THEN** the area below the perforation line has a background color of `#0F0F0F`
- **THEN** the perforation line separates two visually distinct zones

### Requirement: Stub zone displays low-opacity "ADMIT" watermark
The ticket stub zone SHALL contain a diagonal "ADMIT" text watermark rendered at 45°
rotation with 12% fill opacity, centered in the stub zone, drawn before the QR code.

#### Scenario: Watermark renders behind QR code
- **WHEN** a PDF ticket is generated with a scannable QR code
- **THEN** the "ADMIT" watermark is visible in the stub background at low opacity
- **THEN** the QR code renders on top of the watermark without obstruction

#### Scenario: Watermark renders behind masked QR state
- **WHEN** a PDF ticket is generated with `canRenderQR = false`
- **THEN** the "ADMIT" watermark is visible behind the masked status box

### Requirement: VIP gold accent color upgraded to richer gold
The VIP accent color SHALL be `#CA8A04` (rich metallic gold) instead of `#D97706` (amber).

#### Scenario: VIP badge renders with updated gold
- **WHEN** a VIP ticket PDF is generated
- **THEN** the tier badge background color is `#CA8A04`

### Requirement: Footer text meets WCAG AA contrast on page background
Footer text SHALL use `#4B5563` on the `#F5F5F5` page background, achieving a contrast
ratio of at least 4.5:1 (WCAG AA for normal text).

#### Scenario: Footer instructions text passes contrast
- **WHEN** a PDF ticket is generated
- **THEN** the footer instruction and copyright text color is `#4B5563`
- **THEN** the text is legible when the PDF is printed on standard white paper

---

## Capability: refund-review-window

# Refund Review Window

## Purpose
TBD - Defines the requirements for the refund review window and lock mechanisms.

## Requirements

### Requirement: 3-Hour Refund Review Window
The system SHALL enforce a 3-hour waiting period between the creation of a refund request and its execution.

#### Scenario: Attempting to approve refund immediately
- **WHEN** a super admin attempts to approve a refund request created less than 3 hours ago
- **THEN** the system prevents the approval and displays a countdown timer or locked state

#### Scenario: Approving refund after review window
- **WHEN** a super admin attempts to approve a refund request created more than 3 hours ago
- **THEN** the system allows the approval and processes the gateway transaction

---

## Capability: refund-validation

# Refund Validation

## Purpose
TBD - Defines the requirements for validating refunds, specifically check-in protections and granular validations.

## Requirements

### Requirement: Ticket-Granular Check-in Validation
The system SHALL validate check-in status (PRICING-003) only for the specific tickets being refunded, rather than the entire booking.

#### Scenario: Refunding an unscanned ticket in a partially scanned booking
- **WHEN** a booking has Ticket A (scanned) and Ticket B (unscanned), and a refund is requested for Ticket B
- **THEN** the system allows the refund without requiring a super_admin manual override

#### Scenario: Refunding a scanned ticket
- **WHEN** a refund is requested for Ticket A (scanned)
- **THEN** the system blocks the refund and requires a super_admin manual override and justification

---

## Capability: repository-quality-gates

# repository-quality-gates Specification

## Purpose
TBD - created by archiving change repository-quality-gates. Update Purpose after archive.
## Requirements
### Requirement: TypeScript Compiler Unused Variable Gates
The TypeScript compiler SHALL prevent successful compilation when there are unused local variables or unused parameters, unless parameters are explicitly prefixed with an underscore (`_`).

#### Scenario: Compilation fails on unused local
- **WHEN** there is a local variable declared in a TypeScript file that is never read or used
- **THEN** the compiler exits with an error code and halts the build

#### Scenario: Compilation succeeds with underscore prefix
- **WHEN** an unused function parameter is prefixed with an underscore (`_param`)
- **THEN** the compiler compiles the file successfully

### Requirement: ESLint Unused Import Enforcement
The ESLint linter SHALL treat any unused imports as errors across all subprojects, using the `@typescript-eslint/no-unused-vars` rule while disabling the base JavaScript `no-unused-vars` rule.

#### Scenario: Lint fails on unused import
- **WHEN** a file contains an import that is not referenced or used in the code
- **THEN** ESLint reports an error and blocks the commit or check

---

## Capability: ticket-level-refunds

# Ticket-Level Partial Refunds

## Purpose
TBD - Defines the requirements for initiating refunds at the ticket-level rather than booking-level.

## Requirements

### Requirement: Ticket-Level Partial Refunds
The system SHALL allow an admin to request a refund for specific tickets within a booking, rather than requiring the entire booking to be refunded.

#### Scenario: Admin requests refund for a single ticket
- **WHEN** an admin selects one ticket out of a multi-ticket booking and requests a partial refund
- **THEN** the system creates a Refund record with status 'requested' containing only that specific ticket ID

#### Scenario: Database prevents duplicate refund requests
- **WHEN** an admin requests a refund for a ticket that already has an active refund request
- **THEN** the database rejects the creation and the system returns an idempotency error

---
