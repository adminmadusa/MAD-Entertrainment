## ADDED Requirements

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
