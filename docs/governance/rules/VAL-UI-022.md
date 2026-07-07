# VAL-UI-022

Hardcoded Inline Color

---

## Purpose

Detects hardcoded hex, rgb(), or hsl() color values in JSX style props that bypass the design token system.

---

## Description

This rule enforces repository consistency and compliance in the UI domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

Hardcoded colors create visual inconsistency, break dark mode and theming support, and make design-wide color changes require searching every file instead of updating one token.

---

## Detection Logic

Scans TSX/JSX files for style={{ ... }} props containing hex (#rrggbb), rgb(), rgba(), or hsl() color values.

---

## Severity

**MEDIUM**

Moderate — must be resolved before release. Design consistency is a core quality requirement.

---

## CI Policy

**WARN**

Violations are logged as warnings and must be reviewed before final merge.

---

## Owner

UI UX Guild

---

## Category

UI

---

## Governance Source

| Field | Value |
|-------|-------|
| Standard | UI-001 |
| Document | UI_UX_GOVERNANCE.md |
| Section | 17. Design System Compliance |

---

## Examples

### ✅ Compliant

```tsx
<div className="text-feedback-danger">Error message</div>
```

### ❌ Non-Compliant

```tsx
<div style={{ color: "#ff4444" }}>Error message</div>
// Hardcoded hex violates DESIGN_SYSTEM.md.
```

---

## Acceptance Criteria

**PASS**: No JSX style props contain hardcoded hex, rgb(), rgba(), or hsl() color values.

**FAIL**: Any style prop contains a literal color value.

---

## Common False Positives

CSS custom property references (var(--color-...)) are compliant and should not be flagged.

---

## Remediation

Replace hardcoded color values with Tailwind token classes (e.g., text-feedback-danger) or CSS custom properties (var(--color-feedback-danger)). See DESIGN_SYSTEM.md Section 2.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UI category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
