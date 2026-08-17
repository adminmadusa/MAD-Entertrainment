## ADDED Requirements

### Requirement: Unified Image Upload
The system SHALL provide a single drag-and-drop zone allowing the admin to upload multiple images at once for an event.

#### Scenario: User drops multiple files
- **WHEN** user drops multiple image files into the unified dropzone
- **THEN** system uploads all files and populates them into the media gallery state

### Requirement: Role Designation
The system SHALL allow users to designate specific images within the unified gallery as the "Banner Image" and "Poster Image".

#### Scenario: User selects a banner image
- **WHEN** user selects the "Make Banner" action on an uploaded image
- **THEN** system tags that specific image as the `bannerImage` and ensures no other image holds that tag

#### Scenario: User selects a poster image
- **WHEN** user selects the "Make Poster" action on an uploaded image
- **THEN** system tags that specific image as the `posterImage` and ensures no other image holds that tag

### Requirement: Automatic Fallback
The system SHALL automatically designate the first uploaded image as the Banner Image if the user saves the event without explicitly designating one.

#### Scenario: Saving without banner selection
- **WHEN** user clicks Save and no image is tagged as the Banner Image
- **THEN** system assigns the first image in the `galleryImages` array to the `bannerImage` field automatically
