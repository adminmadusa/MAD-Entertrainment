# Section

**ID:** UI-LY-002
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** layouts

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| spacing | 'sm' \| 'md' \| 'lg' | 'md' | Spacing scale representing top/bottom padding |
| aria-label | string | undefined | Accessible description label for screen readers |

## Variants
- `sm`: 24px vertical padding
- `md`: 48px vertical padding (default)
- `lg`: 80px vertical padding

## Accessibility
- WCAG: AA
- Screen Reader: native `<section>` element. If `aria-label` is provided, standard landmark properties are satisfied.

## Theme Tokens Used
- Vertical padding spacing values matching design standards.

## Keyboard Support
- Structural presentation container.

## Composition Rules
- Use for separating large page blocks or sections (e.g. Hero Section, Featured Events Section).

## Breaking Changes
(none)

## Migration Notes
(none)
