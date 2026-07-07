# VAL-UI-021

Image Missing Dimensions (CLS Risk)

---

## Purpose

Detects <img> elements missing explicit width and height attributes, which causes Cumulative Layout Shift (CLS).

---

## Description

This rule enforces repository consistency and compliance in the UI domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

Browsers cannot reserve space for images without explicit dimensions, causing layout to shift as images load. CLS degrades Core Web Vitals scores and user experience.

---

## Detection Logic

Scans TSX/JSX files for <img elements that are missing width= or height= attributes.

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
| Section | 18. Performance |

---

## Examples

### ✅ Compliant

```tsx
<img src="/ticket.png" alt="Event ticket" width={640} height={360} />
```

### ❌ Non-Compliant

```tsx
<img src="/ticket.png" alt="Event ticket" />
// Missing width and height — causes CLS.
```

---

## Acceptance Criteria

**PASS**: Every <img> element has explicit width and height attributes.

**FAIL**: Any <img> element is missing width or height.

---

## Common False Positives

Next.js Image component (<Image />) handles dimensions differently — this rule should be scoped to native <img> elements only.

---

## Remediation

Add width and height attributes matching the intrinsic image dimensions. Use aspect-ratio CSS to maintain proportions responsively.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UI category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
