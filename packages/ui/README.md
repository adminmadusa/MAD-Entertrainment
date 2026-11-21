# @mad/ui Design System & Component Catalog

- **Package**: `@mad/ui`
- **Owner**: Platform / UI UX Guild
- **Status**: Stable
- **Version**: 1.4.0
- **Accessibility Target**: WCAG 2.1 AA Conformance
- **Theme Standard**: CSS Custom Properties (`--color-*`, `--radius-*`, `--space-*`)

---

## 1. Overview
`@mad/ui` is the canonical design system component library for the MAD Entertrainment monorepo. It provides accessible, responsive, and composable React primitives, composites, and layout components built with Tailwind CSS and CSS design tokens.

---

## 2. Component Inventory & Registry

All components are registered with permanent IDs and governance tracking:

### Primitives (9 Components)

| Component | ID | Status | Group | WCAG | Key Features |
|---|---|---|---|---|---|
| **Button** | `UI-PR-001` | Stable | Primitives | AA | Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`. Sizes: `sm`, `md`, `lg`. Built-in loading state with Spinner. |
| **IconButton** | `UI-PR-002` | Stable | Primitives | AA | Square touch targets (min 44px on mobile), accessible `aria-label` enforcement, tooltip support. |
| **Input** | `UI-PR-003` | Stable | Primitives | AA | Text input with clear states, prefix/suffix adornments, error borders, and high-contrast focus rings. |
| **Textarea** | `UI-PR-004` | Stable | Primitives | AA | Auto-resizing or fixed multi-line input, character count limits, error boundary integration. |
| **Label** | `UI-PR-005` | Stable | Primitives | AA | Semantic `<label>` element with required indicators, linked via `htmlFor`. |
| **Badge** | `UI-PR-006` | Stable | Primitives | AA | Status badges (`success`, `warning`, `error`, `neutral`, `brand`) with WCAG 4.5:1 color contrast. |
| **Spinner** | `UI-PR-007` | Stable | Primitives | AA | SVG animated indicator with `role="status"` and accessible screen-reader text. |
| **Skeleton** | `UI-PR-008` | Stable | Primitives | AA | Pulse animation placeholders for cards, text rows, avatars, and tables. |
| **Progress** | `UI-PR-009` | Stable | Primitives | AA | Accessible progress bars (`role="progressbar"`) with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. |

### Composites (9 Components)

| Component | ID | Status | Group | WCAG | Key Features |
|---|---|---|---|---|---|
| **Alert** | `UI-CP-002` | Stable | Composites | AA | System alerts (`info`, `success`, `warning`, `error`) with dismiss actions and icon indicators. |
| **Drawer** | `UI-CP-004` | Stable | Composites | AA | Bottom drawer for mobile devices (< 768px), side drawer for desktop, trap focus, Escape dismiss. |
| **EmptyState** | `UI-CP-007` | Stable | Composites | AA | Zero-data states with illustration, message, and call-to-action button. |
| **ErrorState** | `UI-CP-008` | Stable | Composites | AA | Boundary error fallback container with retry action and error details. |
| **FormField** | `UI-CP-001` | Stable | Composites | AA | Wraps Input/Select with Label, helper text, and validation error messages (`aria-describedby`). |
| **LoadingState** | `UI-CP-009` | Stable | Composites | AA | Structured skeleton and spinner wrapper for asynchronous data containers. |
| **Modal** | `UI-CP-003` | Stable | Composites | AA | Accessible dialog dialog modal with backdrop blur, focus trapping, Escape dismiss, and portal mounting. |
| **Table** | `UI-CP-006` | Stable | Composites | AA | Responsive data table with sorting, sticky headers, striped rows, and horizontal scroll containment. |
| **Tooltip** | `UI-CP-005` | Stable | Composites | AA | Hover/focus floating tooltip with keyboard accessibility (`Esc` dismiss) and collision awareness. |

### Layouts (4 Components)

| Component | ID | Status | Group | Key Features |
|---|---|---|---|---|
| **Card** | `UI-LY-001` | Stable | Layouts | Surface container with standard border, subtle shadow, and consistent internal padding (`p-4` to `p-6`). |
| **Grid** | `UI-LY-004` | Stable | Layouts | Responsive CSS grid container with configurable column counts (`cols-1` to `cols-12`) and responsive gaps. |
| **Section** | `UI-LY-002` | Stable | Layouts | Semantic `<section>` wrapper enforcing vertical rhythm and maximum page container widths. |
| **Stack** | `UI-LY-003` | Stable | Layouts | Flexbox stack (vertical or horizontal) with tokenized gap spacing and alignment controls. |

---

## 3. Design Tokens & Styling Contract

All components consume canonical CSS custom properties defined in the root theme:

```css
/* Color Palette */
--color-primary: #f59e0b;
--color-surface-primary: #121214;
--color-surface-secondary: #1a1a1e;
--color-surface-elevated: #24242a;
--color-text-primary: #f9fafb;
--color-text-secondary: #9ca3af;
--color-border: #2e2e36;
--color-danger: #ef4444;
--color-success: #10b981;

/* Radii & Spacing */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

---

## 4. Accessibility & Touch Standards

Per `UI_UX_GOVERNANCE.md` (UI-001):
1. **Touch Targets**: Minimum `44px × 44px` for all clickable/interactive controls on mobile devices.
2. **Keyboard Trapping**: Modals and Drawers trap keyboard focus using `tabbable` elements and release upon close.
3. **Screen Readers**: Interactive elements declare explicit `aria-label`, `aria-expanded`, and `aria-hidden` attributes.
4. **Contrast**: Text and graphical elements strictly satisfy WCAG AA 4.5:1 (normal text) and 3:1 (large text / borders).

---

## 5. Usage Example

```tsx
import { Button, Modal, Card, FormField, Input } from '@mad/ui';

export function CheckoutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Reservation">
      <Card>
        <FormField label="Full Name" required>
          <Input placeholder="Jane Doe" />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary">Confirm & Pay</Button>
        </div>
      </Card>
    </Modal>
  );
}
```
