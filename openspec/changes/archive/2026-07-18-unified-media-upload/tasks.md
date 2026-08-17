## 1. Unified Dropzone Component

- [x] 1.1 Create `UnifiedMediaUpload.tsx` by adapting `CloudinaryUpload.tsx` to handle multiple files in a single generic pool.
- [x] 1.2 Implement the drag-and-drop array state to hold `CloudinaryImage[]`.

## 2. Role Assignment UX (Gallery View)

- [x] 2.1 Render the uploaded images in a grid format below the dropzone.
- [x] 2.2 Add interactive tags/radio buttons to each image card allowing the user to select "Banner Image" and "Poster Image".
- [x] 2.3 Ensure UI strictly enforces mutually exclusive selection (only one Banner, only one Poster).

## 3. Form Integration & Fallback Logic

- [x] 3.1 Update `EventMediaCard.tsx` to mount the new unified component instead of the three separate ones.
- [x] 3.2 Implement the fallback logic `banner = selectedBanner || images[0]`.
- [x] 3.3 Ensure the `onChange` event bubbles the correctly shaped data (`bannerImage`, `posterImage`, `galleryImages`) up to the parent form so the backend API contract remains untouched.
