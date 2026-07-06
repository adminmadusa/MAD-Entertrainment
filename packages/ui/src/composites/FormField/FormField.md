# FormField

**ID:** UI-CP-001  
**Status:** Preview  
**Since:** 1.3.0  
**Last Reviewed:** 2026-07-06  
**Owner:** platform  
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | (required) | Label text displayed above the input element |
| htmlFor | string | undefined | Associates the label to input ID |
| hint | string | undefined | Supporting inline label caption text |
| error | string | undefined | Displays validation message and paints border states |
| required | boolean | false | Displays asterisk representing mandatory state |

## Variants
- Standard layout column grouping labels, hints, and inner children with consistent spacing.

## Accessibility
- WCAG: AA
- Screen Reader: Integrates native `<label>` forwarding. Passes error context dynamically to child elements (e.g. `aria-invalid` and `aria-describedby` links).

## Theme Tokens Used
- Spacing maps (`gap-1.5`)
- Colors (delegated to nested children)

## Keyboard Support
- Standard label click target expansion.

## Composition Rules
- Always use `FormField` to group standard text inputs, select lists, and textareas.

## Breaking Changes
(none)

## Migration Notes
(none)
