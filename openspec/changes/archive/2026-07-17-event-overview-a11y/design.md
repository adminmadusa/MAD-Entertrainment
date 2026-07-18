# Design: Event Overview Accessibility

## Shared Drawer Enhancements

### 1. Centralized Scroll Lock
- Implement scroll lock inside the shared `Drawer` component (`packages/ui/src/composites/Drawer/Drawer.tsx`).
- We will add a `lockScroll` boolean prop (defaulting to `true`).
- When `isOpen` becomes true on the client, we capture the body's original `overflow` style and set it to `hidden`. Upon unmounting or closing, we restore the captured style:
  ```typescript
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, lockScroll]);
  ```

### 2. Focus Restoration & ID Support
- Expose `id?: string` to DrawerProps and apply it to the outer dialog element.
- Retain the active trigger element reference when the drawer mounts. Upon closing/delayed unmounting, restore focus back to the triggering element using the captured ref.

### 3. Accessible Title Link & Reduced Motion
- Bind `aria-labelledby` on the outer dialog div to the drawer header title `h5` element using a dynamically constructed ID.
- Respect prefers-reduced-motion in `Drawer.styles.ts`:
  ```css
  motion-reduce:transition-none
  ```

---

## Event Overview Adjustments

### 1. A11y Semantics & Contrast
- Upgrade organizer subtext to `text-text-secondary`.
- Add `aria-expanded={isOverviewOpen}`, `aria-haspopup="dialog"`, and `aria-controls="event-overview-drawer"` to the trigger button.
- Apply focus ring classes (`focus:ring-2 focus:ring-accent-cyan/50`).

### 2. Touch Target Compliance
- Update trigger button to `min-h-[44px] py-2 flex items-center` to satisfy target requirements without layout shifts.
