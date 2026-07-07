# Design System Standard

| Field | Value |
|-------|-------|
| **Standard** | UI-DS-001 |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A |
| **Review Frequency** | Quarterly |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md) |
| **Related Standards** | [COMPONENT_GUIDELINES.md](COMPONENT_GUIDELINES.md), [RESPONSIVE_GUIDELINES.md](RESPONSIVE_GUIDELINES.md) |

---

## Authority

This document is subordinate to [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md).

If any rule here conflicts with `UI_UX_GOVERNANCE.md`, that document takes precedence.

New design tokens and system-level decisions must be added here before being reflected in code or skills.

---

## Purpose

Define the MAD Entertrainment design token system — the shared vocabulary of visual decisions that every UI component consumes. Design tokens are the single source of truth for all visual constants. No hardcoded values are permitted in component code.

---

## 1. Design Token Governance Rules

- All visual constants must be expressed as design tokens.
- No hardcoded hex values, pixel sizes, or opacity values in component source.
- Tokens must be defined in `packages/ui` before use.
- Token names must be semantic (describe purpose, not value).

**Correct**: `color-surface-danger`
**Incorrect**: `#ff4444`

---

## 2. Color Tokens

### Token Naming Convention

```
color-{role}-{variant}

Roles: brand, surface, text, border, feedback, overlay
Variants: primary, secondary, muted, emphasis, danger, warning, success, info
```

### Core Palette (TODO: populate with actual Tailwind/CSS variable values)

| Token | Purpose | Value |
|-------|---------|-------|
| `color-brand-primary` | Primary brand color | _TBD_ |
| `color-brand-secondary` | Secondary brand accent | _TBD_ |
| `color-surface-base` | Page background | _TBD_ |
| `color-surface-elevated` | Card / panel background | _TBD_ |
| `color-surface-overlay` | Modal backdrop | _TBD_ |
| `color-text-primary` | Body text | _TBD_ |
| `color-text-secondary` | Supporting text | _TBD_ |
| `color-text-muted` | Disabled / placeholder text | _TBD_ |
| `color-text-inverse` | Text on dark surfaces | _TBD_ |
| `color-border-default` | Standard border | _TBD_ |
| `color-border-emphasis` | Focused / active border | _TBD_ |
| `color-feedback-danger` | Error states | _TBD_ |
| `color-feedback-warning` | Warning states | _TBD_ |
| `color-feedback-success` | Success states | _TBD_ |
| `color-feedback-info` | Informational states | _TBD_ |

> **TODO**: Extract actual token values from the Tailwind config in `packages/ui` and populate this table. Owner: Engineering Lead.

### Contrast Requirements

All text must meet WCAG AA contrast ratios:
- Normal text: 4.5:1 minimum
- Large text (≥18pt or ≥14pt bold): 3:1 minimum
- Interactive focus indicators: 3:1 against adjacent colors

---

## 3. Typography Scale

### Font Family

| Role | Family | Fallback |
|------|--------|---------|
| Primary (UI) | _TBD_ | `system-ui, sans-serif` |
| Monospace (Code) | _TBD_ | `monospace` |

> **TODO**: Confirm font families in use across `apps/web` and `apps/admin`.

### Type Scale

| Token | Size | Line Height | Weight | Use |
|-------|------|------------|--------|-----|
| `text-display-lg` | _TBD_ | _TBD_ | 700 | Hero headings |
| `text-display-md` | _TBD_ | _TBD_ | 700 | Page titles |
| `text-heading-lg` | _TBD_ | _TBD_ | 600 | Section headings |
| `text-heading-md` | _TBD_ | _TBD_ | 600 | Card titles |
| `text-heading-sm` | _TBD_ | _TBD_ | 600 | Sub-section titles |
| `text-body-lg` | _TBD_ | _TBD_ | 400 | Body copy (large) |
| `text-body-md` | _TBD_ | _TBD_ | 400 | Body copy (default) |
| `text-body-sm` | _TBD_ | _TBD_ | 400 | Supporting text |
| `text-label-md` | _TBD_ | _TBD_ | 500 | Form labels |
| `text-label-sm` | _TBD_ | _TBD_ | 500 | Badges, tags |
| `text-mono-md` | _TBD_ | _TBD_ | 400 | Code, IDs |

### Typography Rules

- Use only tokens from the scale above — no arbitrary font sizes.
- Never use `px` for font sizes in CSS (use `rem`).
- Maximum line length for body text: 75 characters.
- Do not set `line-height` inline; always use the token.

---

## 4. Spacing Scale

Based on a 4px base unit.

| Token | Value | Common Use |
|-------|-------|-----------|
| `space-1` | 4px | Icon gaps, micro-spacing |
| `space-2` | 8px | Component internal padding (compact) |
| `space-3` | 12px | Icon + label gap |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Card internal padding |
| `space-6` | 24px | Section gap (mobile) |
| `space-8` | 32px | Section gap (desktop) |
| `space-10` | 40px | Major section breaks |
| `space-12` | 48px | Page-level vertical rhythm |
| `space-16` | 64px | Hero sections |

### Spacing Rules

- Use only spacing tokens — no `mt-[17px]` or arbitrary values.
- Do not mix spacing scales (e.g., `p-3 px-5`).
- Page horizontal padding: `space-4` (mobile) → `space-8` (desktop).
- Card internal padding: `space-4` minimum.

---

## 5. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | 4px | Badges, tags |
| `radius-md` | 8px | Inputs, small cards |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Dialogs, large cards |
| `radius-full` | 9999px | Pills, avatars |

Mixing radius values within the same component family is not permitted.

---

## 6. Elevation & Shadows

| Token | Value | Use |
|-------|-------|-----|
| `shadow-none` | `none` | Flat elements |
| `shadow-sm` | _TBD_ | Subtle cards on light backgrounds |
| `shadow-md` | _TBD_ | Raised cards, dropdowns |
| `shadow-lg` | _TBD_ | Dialogs, modals |
| `shadow-xl` | _TBD_ | Floating panels, command palettes |

> **TODO**: Extract shadow values from `packages/ui` Tailwind config.

---

## 7. Animation & Motion

### Duration Tokens

| Token | Value | Use |
|-------|-------|-----|
| `duration-instant` | 0ms | No animation (reduced-motion) |
| `duration-fast` | 100ms | Micro-interactions (button press, toggle) |
| `duration-normal` | 200ms | Standard transitions (hover, focus) |
| `duration-slow` | 300ms | Panel slides, drawer open/close |
| `duration-deliberate` | 500ms | Page transitions, onboarding |

### Easing Tokens

| Token | Value | Use |
|-------|-------|-----|
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |

### Motion Rules

- All animated elements must respect `prefers-reduced-motion`.
- Animation must not block interaction.
- Avoid animations longer than `duration-deliberate` in core UI flows.
- Never animate layout properties (`width`, `height`, `top`, `left`) — use `transform` instead.

---

## 8. Icon System

| Property | Standard |
|----------|---------|
| Library | _TBD (confirm: Lucide, Heroicons, or Radix Icons)_ |
| Size XS | 12px |
| Size SM | 16px |
| Size MD | 20px (default) |
| Size LG | 24px |
| Size XL | 32px |

> **TODO**: Confirm icon library in use. All icon usage must reference the library — no SVG copy-paste into components.

### Icon Rules

- All icon-only buttons must have an accessible `aria-label`.
- Icons must not convey meaning without a visible or accessible text alternative.
- Icon color must use a color token, not a hardcoded value.

---

## 9. Z-Index Policy

| Token | Value | Use |
|-------|-------|-----|
| `z-base` | 0 | Standard document flow |
| `z-raised` | 10 | Sticky headers, floating labels |
| `z-dropdown` | 100 | Dropdown menus |
| `z-sticky` | 200 | Sticky navigation |
| `z-overlay` | 300 | Modal backdrops |
| `z-modal` | 400 | Modal dialogs |
| `z-toast` | 500 | Toast notifications |
| `z-tooltip` | 600 | Tooltips |

Never use arbitrary z-index values. Never exceed `z-tooltip` without Engineering Lead approval.

---

## Change Log

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-07-07 | MAD Engineering Governance | Initial design system standard |
