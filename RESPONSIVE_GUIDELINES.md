# Responsive Design Guidelines

| Field | Value |
|-------|-------|
| **Standard** | UI-RG-001 |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A |
| **Review Frequency** | Quarterly |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md) |
| **Related Standards** | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [COMPONENT_GUIDELINES.md](COMPONENT_GUIDELINES.md) |

---

## Authority

This document is subordinate to [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md).

If any rule here conflicts with `UI_UX_GOVERNANCE.md`, that document takes precedence.

---

## Purpose

Define how every page and component in the MAD Entertrainment platform must respond to different viewport sizes. Responsive design is not optional — it is a core correctness requirement.

---

## 1. Breakpoint System

### Canonical Breakpoints

| Name | Min Width | Target Devices |
|------|-----------|---------------|
| `xs` | 320px | Small mobile (SE, older Android) |
| `sm` | 375px | Standard mobile (iPhone, mid-range Android) |
| `md` | 768px | Tablet (iPad portrait, large Android) |
| `lg` | 1024px | Laptop / tablet landscape |
| `xl` | 1440px | Desktop monitor |
| `2xl` | 1920px | Large display (enhancement only) |

### Rules

- Design begins at `xs` (320px). Everything above is an enhancement.
- Every new page must be verified at `xs`, `sm`, `md`, `lg`, and `xl` before merge.
- `2xl` is optional but must not break the `xl` layout.
- No breakpoint may be skipped — an intermediate layout must never collapse to the smallest or largest variant.

### Tailwind Breakpoint Mapping

```css
/* xs — no prefix (mobile-first default) */
/* sm — sm:   */
/* md — md:   */
/* lg — lg:   */
/* xl — xl:   */
/* 2xl — 2xl: */
```

---

## 2. Mobile-First Implementation Rule

All CSS must be written mobile-first.

```tsx
// Correct (mobile-first)
<div className="p-4 md:p-8 lg:p-12">

// Incorrect (desktop-first)
<div className="p-12 md:p-8 sm:p-4">
```

Overriding desktop styles to produce mobile layouts creates complexity and specificity conflicts. Mobile-first is the required approach.

---

## 3. Grid System

### Page Layout Grid

| Breakpoint | Columns | Gutter | Margin |
|------------|---------|--------|--------|
| xs (320px) | 4 | 16px | 16px |
| sm (375px) | 4 | 16px | 20px |
| md (768px) | 8 | 24px | 32px |
| lg (1024px) | 12 | 24px | 48px |
| xl (1440px) | 12 | 32px | 80px |

### Rules

- Use the CSS Grid or Flexbox — not `float` or `position: absolute` for layout.
- Column spans must not exceed the available columns at any breakpoint.
- Grid gaps must use spacing tokens from [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

## 4. Container Widths

| Container Type | Max Width | Use |
|----------------|-----------|-----|
| `container-sm` | 640px | Narrow content (forms, settings) |
| `container-md` | 768px | Standard content |
| `container-lg` | 1024px | Wide content (tables, dashboards) |
| `container-xl` | 1280px | Full-width layouts |
| `container-full` | 100% | Edge-to-edge (hero, scanner) |

Containers must be horizontally centered with `mx-auto`.

---

## 5. Typography Responsive Rules

Font sizes must scale with viewport:

| Token | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| `text-display-lg` | 28px | 36px | 48px |
| `text-display-md` | 24px | 30px | 36px |
| `text-heading-lg` | 20px | 24px | 28px |
| `text-heading-md` | 18px | 20px | 24px |
| `text-body-md` | 16px | 16px | 16px |
| `text-body-sm` | 14px | 14px | 14px |

> **TODO**: Confirm actual responsive type scale against `packages/ui` Tailwind config.

---

## 6. Component Responsive Patterns

### Navigation

| Viewport | Pattern |
|----------|---------|
| Mobile (xs–sm) | Bottom navigation bar or hamburger drawer |
| Tablet (md) | Collapsible sidebar or top navigation |
| Desktop (lg–xl) | Full sidebar or persistent top navigation |

Bottom navigation must always be visible on mobile — never hidden behind a hamburger unless the navigation has more than 5 primary items.

### Cards

| Viewport | Layout |
|----------|--------|
| Mobile | Single column, full width |
| Tablet | 2-column grid |
| Desktop | 3–4 column grid |

Cards must never overflow their container horizontally.

### Tables

| Viewport | Pattern |
|----------|---------|
| Mobile | Horizontal scroll within a `overflow-x: auto` wrapper, or card-list alternative |
| Tablet | Full table with reduced column count |
| Desktop | Full table with all columns |

Tables must never force horizontal page scroll — only internal table scroll is permitted.

### Forms

| Viewport | Layout |
|----------|--------|
| Mobile | Single-column, full-width inputs |
| Tablet | May use 2-column for related fields (e.g., First/Last name) |
| Desktop | May use up to 3 columns for dense data entry |

Form inputs must be at least 44px tall at all viewports for touch usability.

### Dialogs & Drawers

| Viewport | Pattern |
|----------|---------|
| Mobile | Full-screen drawer (bottom sheet or side drawer) |
| Tablet | Centered modal at 90% viewport width |
| Desktop | Centered modal at max 600px width |

Never use a fixed-width dialog on mobile — it will overflow.

---

## 7. Safe Area Support

For mobile web:

- Use `env(safe-area-inset-*)` for bottom navigation and fixed footers.
- Apply `pb-safe` or equivalent to fixed bottom elements.

```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

---

## 8. Overflow Rules

- No horizontal scroll at the page level at any breakpoint.
- Horizontal scroll is permitted inside explicitly bounded containers (e.g., code blocks, tables with `overflow-x: auto`).
- `overflow-x: hidden` on root elements is forbidden — it masks layout bugs instead of fixing them.
- Text overflow must use `text-overflow: ellipsis` with `overflow: hidden` and `white-space: nowrap`, not truncation by clipping.

---

## 9. Image Responsive Rules

- All `<img>` elements must include `width` and `height` attributes to prevent CLS.
- Use `object-fit: cover` for fixed aspect-ratio image containers.
- Use `srcset` and `sizes` for serving appropriately sized images.
- All images must include a meaningful `alt` attribute.
- Decorative images must use `alt=""`.

---

## 10. Responsive Verification Checklist

Before any UI PR is merged:

```
[ ] Verified at 320px — no overflow, no broken layout
[ ] Verified at 375px — no overflow, no broken layout
[ ] Verified at 768px — no overflow, no broken layout
[ ] Verified at 1024px — no overflow, no broken layout
[ ] Verified at 1440px — no overflow, no broken layout
[ ] No horizontal page scroll at any breakpoint
[ ] Navigation pattern matches viewport
[ ] Cards/tables respond correctly
[ ] Forms are single-column on mobile
[ ] Bottom navigation uses safe-area inset
[ ] Images have width, height, and alt
```

---

## Change Log

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-07-07 | MAD Engineering Governance | Initial responsive design guidelines |
