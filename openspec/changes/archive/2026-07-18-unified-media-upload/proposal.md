## Why

The current media upload flow uses three separate dropzones (Banner, Poster, Gallery), which forces the user to upload files into strict, pre-allocated buckets and causes friction. A unified "Upload your files" dropzone simplifies the UI and improves the UX. Users can bulk-upload all event imagery to a general pool and subsequently select which image serves as the Banner or Poster.

## What Changes

*   Replace the three individual upload zones (Banner, Poster, Gallery) with a single, unified "Upload your files" dropzone.
*   After files are uploaded, display them in a gallery/list view.
*   Provide UI controls (e.g., radio buttons, tags, or a context menu) on the uploaded images to designate one as the "Banner Image" and one as the "Poster Image".
*   If the user does not explicitly select a Banner Image, automatically assign the first uploaded image in the queue as the Banner Image.

## Capabilities

### New Capabilities
- `unified-event-media-upload`: Defines the unified upload dropzone, role assignment logic (Banner/Poster), and fallback selection rules.

### Modified Capabilities
- None.

## Impact

*   **UI/UX:** Major refactor of the `EventMediaCard`, `EventGalleryUpload`, and `CloudinaryUpload` components in the Admin Dashboard.
*   **API / Database:** The backend API (`event.service.ts` or `adminApiClient`) likely remains identical or requires minimal changes, as it simply accepts image URLs and assigns them to fields in the `Event` document (`bannerImage`, `posterImage`, `galleryImages`). The logic of which URL goes to which field will shift entirely to the frontend React state.
