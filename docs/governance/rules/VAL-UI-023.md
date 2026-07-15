# VAL-UI-023

Overflow-X Hidden on Root Container

---

## Purpose

Detects overflow-x: hidden on root-level containers, which masks horizontal scroll defects.

---

## Description

This rule enforces repository consistency and compliance in the UI domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

Applying overflow-x: hidden to root containers hides the symptom of horizontal overflow rather than fixing the cause. It also breaks sticky positioning and scroll-linked animations.

---

## Detection Logic

Scans CSS, Tailwind, and styled-components for overflow-x: hidden applied to html, body, or elements with class names suggesting a root page wrapper.

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

UI

---

## Governance Source

| Field | Value |
|-------|-------|
| Standard | UI-001 |
| Document | UI_UX_GOVERNANCE.md |
| Section | 2. Responsive Design |

---

## Examples

### ✅ Compliant

```css
.card-container { max-width: 100%; }
```

### ❌ Non-Compliant

```css
body { overflow-x: hidden; }
// Masks overflow instead of fixing it.
```

---

## Acceptance Criteria

**PASS**: No root-level containers apply overflow-x: hidden.

**FAIL**: overflow-x: hidden is applied to html, body, or a root page wrapper.

---

## Common False Positives

overflow-x: hidden on a scroll-container component (not a root page wrapper) is legitimate. Scope to root-level selectors only.

---

## Remediation

Remove overflow-x: hidden from root containers. Identify and fix the element causing horizontal overflow — usually a component with a fixed width wider than the viewport or missing max-width: 100%.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UI category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
