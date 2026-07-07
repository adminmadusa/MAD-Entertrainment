# VAL-UI-025

Duplicate Tailwind Utilities

---

## Purpose

Detects duplicate Tailwind CSS utility classes on the same element where the earlier value is dead code.

---

## Description

This rule enforces repository consistency and compliance in the UI domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

Tailwind applies the last instance of a conflicting utility. Earlier duplicates are silently ignored, creating dead code that misleads engineers about the actual applied styles.

---

## Detection Logic

Parses className strings and detects when the same Tailwind utility prefix appears more than once (e.g., two p- values, two m- values, or two identical classes).

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
<div className="flex items-center p-4">Content</div>
```

### ❌ Non-Compliant

```tsx
<div className="flex flex items-center p-4 p-5">Content</div>
// p-4 and first "flex" are dead code.
```

---

## Acceptance Criteria

**PASS**: No className string contains duplicate Tailwind utility classes.

**FAIL**: Any element has the same utility class applied more than once.

---

## Common False Positives

None identified. Duplicate utilities are always unintentional.

---

## Remediation

Remove the duplicate utility class. Keep only the intended value. If two values were both intended (e.g., p-4 on mobile, p-5 on desktop), use responsive prefixes: p-4 md:p-5.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UI category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
