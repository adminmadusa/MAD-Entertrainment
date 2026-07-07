# Accessibility Guidelines

| Field | Value |
|-------|-------|
| **Standard** | UI-A11Y-001 |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A |
| **Review Frequency** | Quarterly |
| **Conformance Target** | WCAG 2.1 Level AA |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md) |
| **Related Standards** | [INTERACTION_GUIDELINES.md](INTERACTION_GUIDELINES.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |

---

## Authority

This document is subordinate to [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md).

If any rule here conflicts with `UI_UX_GOVERNANCE.md`, that document takes precedence.

---

## Purpose

Define the mandatory accessibility requirements for every page, component, and interaction in the MAD Entertrainment platform. Accessibility is a correctness requirement — not an enhancement. WCAG AA compliance is the minimum standard for all production UI.

---

## 1. Conformance Standard

**Target**: WCAG 2.1 Level AA

No UI PR may be merged if it introduces a WCAG AA regression on any currently compliant page.

---

## 2. Semantic HTML (Mandatory)

Use the correct HTML element for the correct purpose.

| Purpose | Correct Element | Incorrect |
|---------|----------------|-----------|
| Page landmark | `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>` | `<div>` |
| Heading | `<h1>`–`<h6>` (in order) | `<div class="title">` |
| Button action | `<button>` | `<div onClick>` |
| Navigation link | `<a href>` | `<div onClick>` |
| Form control | `<input>`, `<select>`, `<textarea>` with `<label>` | Unlabelled inputs |
| List | `<ul>/<ol>` + `<li>` | `<div>` with manual bullets |
| Table data | `<table>`, `<thead>`, `<tbody>`, `<th scope>`, `<td>` | CSS grid of divs |

### Rules

- Each page must have exactly one `<h1>`.
- Heading hierarchy must not skip levels (e.g., `<h1>` → `<h3>` without `<h2>` is invalid).
- Interactive elements must be native HTML interactive elements or include `role` + keyboard event handlers.
- No `<div>` or `<span>` may handle click events without also being keyboard-navigable.

---

## 3. Color Contrast

| Text Type | Minimum Ratio |
|-----------|--------------|
| Normal text (< 18pt, or < 14pt bold) | 4.5:1 |
| Large text (≥ 18pt, or ≥ 14pt bold) | 3:1 |
| UI components and graphical objects | 3:1 |
| Focus indicators | 3:1 against adjacent color |
| Disabled elements | Exempt (still recommended ≥ 2.5:1) |

Never use color alone to convey meaning. Always pair with an icon, label, or pattern.

---

## 4. Keyboard Navigation

Every interactive element must be reachable and operable using keyboard alone.

### Required Keyboard Behaviors

| Element | Required Keys |
|---------|--------------|
| All interactive elements | `Tab` to focus, `Shift+Tab` to reverse |
| Buttons | `Enter` or `Space` to activate |
| Links | `Enter` to activate |
| Checkboxes / Radios | `Space` to toggle |
| Select / Listbox | Arrow keys to navigate |
| Dropdown menus | `Enter`/`Space` to open, `Esc` to close, arrows to navigate |
| Modals / Drawers | `Esc` to close, focus trapped within while open |
| Date pickers | Arrow keys for date navigation |
| Sliders | Arrow keys to adjust value |

### Tab Order Rules

- Tab order must follow the visual reading order (left-to-right, top-to-bottom).
- Do not use `tabindex > 0` — it creates artificial tab order that diverges from visual order.
- `tabindex="0"` may be used on custom interactive elements.
- `tabindex="-1"` is permitted for programmatic focus management (e.g., focusing a dialog heading on open).
- Hidden or disabled elements must not receive focus.

---

## 5. Focus Management

### Visible Focus Indicators

All interactive elements must have a clearly visible focus indicator.

- Focus ring must have at least 3:1 contrast against the adjacent background.
- Never remove focus indicators with `outline: none` or `outline: 0` without providing an equally visible custom focus style.

```css
/* Acceptable custom focus */
:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
}

/* Unacceptable */
:focus {
  outline: none;
}
```

### Focus Trapping

- When a modal or drawer opens, focus must move to the first focusable element inside it.
- Focus must be trapped within the modal — Tab and Shift+Tab must not escape.
- When the modal closes, focus must return to the trigger element that opened it.

Use Radix UI's `Dialog` and `Drawer` primitives, which handle focus trapping natively.

---

## 6. ARIA Attributes

### Rules

- Never use ARIA to override semantic HTML — fix the HTML instead.
- Do not use `role="button"` on a `<div>` when a `<button>` can be used.
- Do not use ARIA attributes that duplicate the semantics of the HTML element.

### Required ARIA for Common Patterns

| Pattern | Required ARIA |
|---------|-------------|
| Icon-only button | `aria-label="[action description]"` |
| Toggle button | `aria-pressed="true/false"` |
| Loading spinner | `aria-live="polite"` + `aria-label="Loading"` |
| Error message | `role="alert"` or `aria-live="assertive"` |
| Required field | `aria-required="true"` |
| Invalid field | `aria-invalid="true"` + `aria-describedby="[error-id]"` |
| Expanded section | `aria-expanded="true/false"` |
| Modal | `role="dialog"` + `aria-modal="true"` + `aria-labelledby="[title-id]"` |
| Navigation landmark | `aria-label="[nav name]"` when multiple `<nav>` elements exist |
| Progress | `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` |

### Live Region Rules

- `aria-live="polite"`: Use for non-urgent updates (search results loaded, filter applied).
- `aria-live="assertive"`: Use only for critical updates requiring immediate attention (error alerts, session expiry warnings).
- Never use `aria-live="assertive"` for routine status messages — it interrupts screen reader reading flow.

---

## 7. Images & Media

- All informative `<img>` elements must have a descriptive `alt` attribute.
- Decorative images must use `alt=""` (empty string — not omitted).
- SVG icons used as meaningful images must include `<title>` or `aria-label`.
- SVG icons used as decorative must have `aria-hidden="true"`.
- Video content must have captions.
- Audio content must have transcripts.

---

## 8. Forms & Inputs

- Every input must have an associated `<label>` (using `for`/`id` or wrapping).
- Placeholder text must not substitute for a visible label.
- Error messages must be programmatically associated with their input (`aria-describedby`).
- Success messages must be announced via `aria-live`.
- Required fields must be marked visually and with `aria-required="true"`.
- Do not rely on `placeholder` text for format instructions — use helper text below the input.

---

## 9. Touch Accessibility

- Minimum touch target size: **44×44px** for all interactive elements.
- Touch targets must have sufficient spacing to prevent accidental activation.
- Swipe gestures must have keyboard or button alternatives.

---

## 10. Reduced Motion

All animated elements must respect the `prefers-reduced-motion` media query.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Functionality must never depend on animation.

---

## 11. Accessibility Testing Procedure

### Automated (Required for every PR)

> **TODO**: Define the automated accessibility tool (axe-core, Lighthouse, or similar) and integrate into CI.

### Manual (Required before every major release)

1. **Keyboard-only navigation test**: Navigate the entire feature using Tab, Shift+Tab, Enter, Space, and arrow keys only.
2. **Screen reader test**: Test with VoiceOver (macOS/iOS) or NVDA (Windows).
3. **Color contrast test**: Use browser DevTools or the axe extension to verify all contrast ratios.
4. **Zoom test**: Increase browser zoom to 200% and verify no content is lost or overlapped.
5. **High-contrast mode test**: Enable OS high-contrast mode and verify UI remains usable.

---

## 12. Accessibility PR Checklist

```
[ ] One <h1> per page
[ ] Heading hierarchy is correct (no skipped levels)
[ ] All images have alt text (or alt="" for decorative)
[ ] All interactive elements are keyboard accessible
[ ] Visible focus indicators present on all interactive elements
[ ] Focus trapped in modals/drawers
[ ] Focus returns to trigger on modal close
[ ] Color contrast meets WCAG AA
[ ] Color alone is not the only means of conveying information
[ ] Error messages are programmatically associated (aria-describedby)
[ ] All form inputs have visible labels
[ ] Icon-only buttons have aria-label
[ ] Live regions used correctly (polite vs assertive)
[ ] prefers-reduced-motion respected
[ ] Touch targets minimum 44x44px
```

---

## Change Log

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-07-07 | MAD Engineering Governance | Initial accessibility guidelines (WCAG 2.1 AA) |
