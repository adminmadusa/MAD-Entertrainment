# VAL-UX-002

Missing Empty State

---

## Purpose

Detects list and table components that render an empty container instead of a proper empty state.

---

## Description

This rule enforces repository consistency and compliance in the UX domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

A blank container when data is empty provides no context, explanation, or path forward. Users cannot tell whether the page failed, the data is genuinely empty, or an action is required.

---

## Detection Logic

Scans list and table render paths for a length === 0 or items.length === 0 conditional that does not render a named EmptyState component or return an element with aria-label indicating empty.

---

## Severity

**HIGH**

This severity was assigned to ensure appropriate action based on the risk level. Higher severity rules indicate potential blocker risks to build or deployment stability.

---

## CI Policy

**WARN**

Violations are logged as warnings and must be reviewed before final merge.

---

## Owner

UI UX Guild

---

## Category

UX

---

## Governance Source

| Field | Value |
|-------|-------|
| Standard | UI-001 |
| Document | UI_UX_GOVERNANCE.md |
| Section | 13. Empty States |

---

## Examples

### ✅ Compliant

```tsx
if (tickets.length === 0) {
  return <EmptyState heading="No tickets yet" action={<Button>Create</Button>} />;
}
```

### ❌ Non-Compliant

```tsx
if (tickets.length === 0) return null;
// Blank screen — no explanation or action.
```

---

## Acceptance Criteria

**PASS**: Every list/table component handles the empty case with a named EmptyState component or equivalent.

**FAIL**: Any list renders null or an empty container when data.length === 0.

---

## Common False Positives

Components that render zero-item states as intentional UI (e.g., a counter showing 0) should not be flagged.

---

## Remediation

Implement an EmptyState component with a contextual icon, explanatory heading, supporting text, and a primary call-to-action. See UI_PATTERNS.md for the standard empty state structure.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UX category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
