# VAL-UI-024

Arbitrary Tailwind Spacing

---

## Purpose

Detects arbitrary Tailwind spacing values (e.g., mt-[17px]) that bypass the design system spacing scale.

---

## Description

This rule enforces repository consistency and compliance in the UI domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

Arbitrary spacing values bypass the 4px-grid spacing scale defined in DESIGN_SYSTEM.md, leading to pixel-perfect inconsistency and making spacing decisions invisible to the design system.

---

## Detection Logic

Scans className strings for Tailwind arbitrary value syntax matching spacing utilities: (m|p)(t|r|b|l|x|y)?-[...].

---

## Severity

**LOW**

Informational — does not block merge but must be addressed before release.

---

## CI Policy

**INFO_ONLY**

Violations are logged for visibility only and do not affect build status.

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
| Section | 16. Design Consistency |

---

## Examples

### ✅ Compliant

```tsx
<div className="mt-4 p-4">Card content</div>
```

### ❌ Non-Compliant

```tsx
<div className="mt-[17px] p-[13px]">Card content</div>
// Arbitrary values bypass the spacing scale.
```

---

## Acceptance Criteria

**PASS**: No Tailwind className strings contain arbitrary bracket spacing values.

**FAIL**: Any className contains mt-[...], p-[...], or similar arbitrary spacing.

---

## Common False Positives

Arbitrary values for non-spacing properties (e.g., w-[200px] for icon containers with no token equivalent) may be valid. Review each instance.

---

## Remediation

Replace arbitrary spacing values with the nearest token from the DESIGN_SYSTEM.md spacing scale. If no token matches, request a new token from the UI Platform team rather than using an arbitrary value.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UI category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
