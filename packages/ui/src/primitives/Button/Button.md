# Button

**ID:** UI-PR-001
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'outline' | 'primary' | Visual style variation |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Size of the button |
| isLoading | boolean | false | Displays spinner and disables interaction |
| fullWidth | boolean | false | Expands to full width of the parent container |
| leftIcon | ReactNode | undefined | Icon element placed before the label |
| rightIcon | ReactNode | undefined | Icon element placed after the label |

## Variants
- `primary`: Default brand button, solid gradient highlights
- `secondary`: Neutral dark button, solid borders
- `outline`: Border-only button, transparent background
- `ghost`: Borderless, backgrounds visible on hover
- `danger`: Destructive solid brand actions

## Accessibility
- WCAG: AA
- Screen Reader: native `<button>` element, uses `aria-disabled` during loading
- Color Contrast: 4.5:1 ratio on all text and active status backgrounds

## Theme Tokens Used
- `--color-primary`, `--color-surface-secondary`, `--color-border`, `--color-danger`
- `--radius-sm`, `--radius-md`, `--radius-lg`
- `--transition-duration-fast`

## Keyboard Support
| Key | Action |
|-----|--------|
| Enter | Trigger action |
| Space | Trigger action |
| Tab | Navigate focus |

## Composition Rules
- Wrap in FormField only if used as a form action.
- Use IconButton for icon-only actions.

## Breaking Changes
(none)

## Migration Notes
(none)
