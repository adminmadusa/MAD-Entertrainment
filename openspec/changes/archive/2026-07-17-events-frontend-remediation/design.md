# Design: Events Frontend Remediation

## Architecture & State Polish

### 1. Focus Visibility & Contrast
- We will add standard Tailwind classes to ensure keyboard focus visibility on form inputs:
  - Add `focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple` to inputs and textareas.
- Upgrade `text-text-muted` to `text-text-secondary` for dark background elements to satisfy WCAG AA contrast (≥ 4.5:1).

### 2. Double-Submit Guard
- Introduce a synchronous block on click events using a local `useRef(false)` variable:
  ```typescript
  const isSubmitting = useRef(false);
  
  const handleSubmit = () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    mutation.mutate(payload);
  };
  ```
- Toggle back to false in the mutation's `onSettled` callback to handle both success and error paths cleanly.

### 3. Responsive Table minimum width
- Apply a table-specific minimum width determined by the combined intrinsic width of the columns (approx. `850px` - `950px` range) to trigger horizontal scroll container overflow before columns squeeze.

### 4. Shared Pagination Integration
- Verify that the events list shares the exact same pagination behavior (page size, selection state, and filters). Once confirmed, replace inline pagination markup with the shared `<TablePagination>` component from `@mad/ui`.
