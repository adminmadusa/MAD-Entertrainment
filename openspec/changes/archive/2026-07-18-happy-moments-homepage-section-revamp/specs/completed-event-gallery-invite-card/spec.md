## ADDED Requirements

### Requirement: Completed Event Card Gallery Portal
The system SHALL render completed event cards on the homepage as gallery portal invites, communicating that photo memories are available rather than showing a disabled ticket state.

#### Scenario: Card links to gallery
- **WHEN** a user clicks a completed event card on the homepage
- **THEN** the browser navigates directly to `/events/[slug]/gallery` (not `/events/[slug]`)

#### Scenario: Card action bar shows gallery invite
- **WHEN** a completed event card is displayed on the homepage
- **THEN** the action bar SHALL display "Happy Moments" as the label and a "View Gallery →" button (accent-pink styled, fully clickable, no `cursor-not-allowed`)

#### Scenario: Card image is fully colourful at rest
- **WHEN** a completed event card is displayed on the homepage
- **THEN** the banner image SHALL be rendered at full colour (no grayscale filter at rest) with the hover colour-pop effect preserved

#### Scenario: Photo count badge shown when available
- **WHEN** a completed event has a non-zero `galleryCount` field
- **THEN** the card SHALL display a badge showing the count (e.g., "34 Photos") in the image overlay area

#### Scenario: Photo count badge hidden when unavailable
- **WHEN** a completed event has no `galleryCount` or `galleryCount` is zero
- **THEN** the card SHALL render without a photo count badge and no error is thrown

#### Scenario: Accessible card link
- **WHEN** a completed event card is rendered
- **THEN** the link's `aria-label` SHALL read "View Happy Moments gallery for [event title]" to clearly communicate purpose to screen readers
