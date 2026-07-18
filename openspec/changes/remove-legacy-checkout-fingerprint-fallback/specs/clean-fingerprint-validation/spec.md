## ADDED Requirements

### Requirement: Clean Fingerprint Comparison
The system SHALL compare retried booking selections strictly using the stored `selectionFingerprint` field without dynamically recalculating it on fallback.

#### Scenario: Matching fingerprint retry
- **WHEN** a user retries a booking checkout with the exact same selection
- **THEN** the stored `selectionFingerprint` matches the request fingerprint and the booking document is reused

#### Scenario: Missing fingerprint on legacy booking
- **WHEN** a user retries checkout on a legacy booking that lacks a `selectionFingerprint`
- **THEN** the comparison fails, the old booking is expired, and a new booking is created with the fingerprint populated
