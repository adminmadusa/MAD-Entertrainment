## Context

The current `EventMediaCard` component defines three strict upload regions for banner, poster, and gallery images. Each uses `EventGalleryUpload` or `CloudinaryUpload` instances. The user has proposed a unified dropzone ("Upload your files") that accepts all event images at once. Post-upload, users will be able to tag/designate specific images for their roles.

## Goals / Non-Goals

**Goals:**
* Consolidate media upload inputs into a single dropzone component.
* Create a gallery UI to display uploaded images.
* Implement role assignment UX (Banner vs Poster).
* Implement fallback logic (First image = Banner) if no explicit selection is made.

**Non-Goals:**
* Changing how the backend API or Cloudinary handles image uploads natively.
* Modifying the schema of the `Event` document in MongoDB.

## Decisions

1.  **State Management:** The unified dropzone will maintain a single array of uploaded images `CloudinaryImage[]`.
2.  **Role Designation UI:** A dropdown menu, a set of radio buttons, or visual tags/badges overlaid on the image thumbnails in the gallery will allow the admin to designate an image as the "Banner Image" or "Poster Image".
3.  **Fallback Logic (Auto-assignment):** When the "Save" or "Next" button is pressed, the `EventMediaCard` will inspect the selections. If no image is tagged as the Banner, the system will slice `images[0]` and assign it to the `bannerImage` payload field automatically, mapping the rest to `galleryImages`.

## Risks / Trade-offs

*   **Risk:** Users might accidentally delete the automatically assigned banner image if they delete the first image in the queue without realizing it's the fallback.
    *   **Mitigation:** Provide a visual badge dynamically to the first image that says "Banner Image (Auto)" if no manual selection is made, so the user has immediate visual feedback on the fallback state.
*   **Trade-off:** The frontend form data translation becomes slightly more complex, converting a flat array of images + tags into the specific `bannerImage`, `posterImage`, and `galleryImages` shape expected by the backend.
