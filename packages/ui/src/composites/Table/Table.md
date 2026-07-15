# Table

**ID:** UI-CP-006
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** composites

## Props
All sub-components (`Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`) accept standard HTML element attribute props.

## Variants
- Standard clean data grid styles. Responsive container wrapper wraps Table naturally.

## Accessibility
- WCAG: AA
- Screen Reader: native semantic tags (`<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`).

## Theme Tokens Used
- `--color-border-subtle`
- `--color-text-muted`
- `--color-surface-secondary` (row hover highlights)

## Keyboard Support
- Purely presentation grid layout. Keyboard focus is routed depending on cell children (e.g. actions, checkboxes).

## Composition Rules
- Use to display detailed tabular data structures. Include standard structural sub-components inside.

## Breaking Changes
(none)

## Migration Notes
(none)
