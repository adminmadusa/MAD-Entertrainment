# VAL-UI-020

Alt Text Missing

---

## Purpose

Detects `<img>` elements in JSX/TSX that are missing an `alt` attribute.

---

## Description

All informative images must have a descriptive `alt` attribute so that screen readers can convey the image's meaning to users who cannot see it. Decorative images must use `alt=""` (empty string) to signal to screen readers that the image should be ignored.

---

## Why This Rule Exists

Missing alt text is one of the most common and impactful accessibility failures. It breaks WCAG 2.1 Success Criterion 1.1.1 (Non-text Content, Level A), preventing screen reader users from understanding page content. This rule is `FAIL_BUILD` because accessibility is a correctness requirement, not an enhancement.

---

## Detection Logic

Scans TSX/JSX files for `<img` elements that do not include an `alt=` attribute.

---

## Severity

**CRITICAL**

Missing alt text is a WCAG Level A violation — the most fundamental accessibility requirement. It is a merge-blocking defect.

---

## CI Policy

**FAIL_BUILD**

Violations fail the build immediately. No UI PR may be merged with missing alt attributes.

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
| Section | 15. Accessibility |

---

## Examples

### ✅ Compliant

```tsx
// Informative image with descriptive alt
<img src="/event-banner.jpg" alt="Summer Concert 2026 at the main stage" width={800} height={400} />

// Decorative image with empty alt (not omitted — empty string)
<img src="/divider.svg" alt="" width={200} height={2} />
```

### ❌ Non-Compliant

```tsx
// Missing alt attribute entirely
<img src="/event-banner.jpg" width={800} height={400} />

// Violates: WCAG 2.1 SC 1.1.1 Non-text Content
```

---

## Acceptance Criteria

**PASS**: Every `<img>` element has an `alt` attribute. The value is either a meaningful description or `""` for decorative images.

**FAIL**: Any `<img>` element is missing the `alt` attribute.

---

## Common False Positives

None. The `alt` attribute is always required on `<img>` elements in HTML.

---

## Remediation

Add `alt="[description]"` to informative images describing what the image shows and why it is relevant. Use `alt=""` (empty string, not omitted) for purely decorative images.

---

## Related Rules

- VAL-UI-021 — Image Missing Dimensions (CLS Risk)
- Refer to [REGISTRY.md](../REGISTRY.md) for all UI category rules.
- Refer to [UI_UX_GOVERNANCE.md](../../../UI_UX_GOVERNANCE.md) for full accessibility guidance.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
