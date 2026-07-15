# Card

**ID:** UI-LY-001
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** layouts

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'default' \| 'glass' \| 'outline' | 'default' | Visual backdrop theme |
| padding | 'none' \| 'sm' \| 'md' \| 'lg' | 'md' | Inner padding scale |
| as | ElementType | 'div' | The HTML element tag to render |

## Variants
- `default`: standard card color matching theme surfaces
- `glass`: frosted glass backdrop blur using translucent variables
- `outline`: border-only card, transparent body fill

## Accessibility
- WCAG: AA
- Screen Reader: supports custom semantic tag via `as` prop (e.g. `<article>`, `<section>`, `<nav>`).

## Theme Tokens Used
- `--color-surface-card`
- `--color-border`
- `--radius-2xl`
- `--shadow-sm` / `--shadow-lg`

## Keyboard Support
- Presentation container layout. Focus is routed to interactive child actions.

## Composition Rules
- Used for grouping associated panels, widgets, content summaries, and form blocks.

## Breaking Changes
(none)

## Migration Notes
(none)
