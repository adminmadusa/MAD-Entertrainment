# FIX-001 — Cookie & Storage Compliance Analysis (PROD-001)

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Applicable Law**: GDPR (EU) 2016/679, ePrivacy Directive 2002/58/EC, India DPDP Act 2023
- **Status**: COMPLETE

---

## 1. Objective

Determine whether the MAD Entertrainment web application requires a cookie
consent mechanism. Document legal basis. Define conditions that would trigger
future consent requirements.

---

## 2. Complete Storage Audit

### 2.1 Browser Storage (`localStorage`)

| Key | Data | Purpose | Strictly Necessary | Consent Required |
|---|---|---|---|---|
| `USER_TOKEN` | JWT auth token | Authentication — keeps user logged in | ✅ Yes | ❌ No |
| `USER_DATA` | User profile JSON | Session hydration — avoids re-fetch on reload | ✅ Yes | ❌ No |
| OTP cooldown expiry keys | Unix timestamps | Prevents OTP abuse — rate limiting UX guard | ✅ Yes | ❌ No |
| `popup-last-shown-{id}` | Unix timestamp | Prevents popup re-display within cooldown window | Functional | ❌ No |

### 2.2 Browser Storage (`sessionStorage`)

| Key | Data | Purpose | Strictly Necessary | Consent Required |
|---|---|---|---|---|
| `chunk-recovery-state` | JSON string (`{ reloaded, timestamp }`) | Prevents infinite reload loop on chunk failures | ✅ Yes | ❌ No |

### 2.3 HTTP Cookies

**None detected.** The web application does not set any HTTP cookies. Authentication state is managed via `localStorage` on the client.

### 2.4 IndexedDB

**None detected.** No `indexedDB`, `IDBFactory`, or `openDatabase` calls found in any source file.

### 2.5 Service Worker Cache

The Next.js PWA service worker (`@ducanh2912/next-pwa`) stores:
- Static page shells and asset bundles
- API routes are excluded (`NetworkOnly` strategy for `/api/*`)

This caching is strictly necessary for PWA offline capability and does not store personal data.

### 2.6 Third-Party Scripts and Their Data Practices

| Script | Source | Loaded When | Data Collection | Tracking |
|---|---|---|---|---|
| Google Identity Services | `accounts.google.com/gsi/client` | User initiates Google Sign-In | Auth credential only — no persistent tracking | ❌ None |
| Razorpay Checkout | `checkout.razorpay.com/v1/checkout.js` | User initiates payment | Payment session data — PCI-compliant handler | ❌ None |

Neither script loads on page load. Both are loaded on-demand via `loadScriptOnce()`.
Neither script sets persistent tracking cookies or uses fingerprinting.

### 2.7 Analytics SDKs

**None.** No Google Analytics, Google Tag Manager, Mixpanel, Amplitude, PostHog,
Hotjar, Sentry, Intercom, or any other analytics or monitoring SDK is present
in the client-side codebase.

### 2.8 Advertising SDKs

**None.** No Meta Pixel, TikTok Pixel, Google Ads remarketing, or any advertising
SDK is present.

---

## 3. Legal Analysis

### 3.1 GDPR / ePrivacy Directive (EU)

Under Article 5(3) of the ePrivacy Directive, consent is required for storing
or accessing information on a user's terminal equipment **unless the storage is
strictly necessary** for the provision of the service explicitly requested by
the user.

All storage identified in this audit qualifies as **strictly necessary**:

- Auth tokens (`USER_TOKEN`, `USER_DATA`): necessary to maintain the authenticated
  session the user explicitly created by logging in
- OTP cooldowns: necessary to enforce rate limiting agreed to in the Terms of Service
- Session storage: necessary for application stability (chunk recovery)
- PWA cache: necessary for offline functionality

**Conclusion under GDPR/ePrivacy: No consent banner required.**

### 3.2 India Digital Personal Data Protection (DPDP) Act 2023

Under the DPDP Act, consent is required for processing "personal data." Auth
tokens and session data are processed for the purpose of providing the service.
DPDP allows processing without consent for the performance of a contract (Section
7(b)) and for compliance with legal obligations.

Authentication data is required to perform the service contract (account access,
ticket booking). This falls within the permitted processing categories.

**Conclusion under India DPDP Act: No consent banner required.**

### 3.3 Summary

| Category | Assessment |
|---|---|
| All storage is strictly necessary or functional | ✅ |
| No tracking or advertising storage | ✅ |
| No third-party persistent cookies | ✅ |
| Consent banner required now | ❌ No |

---

## 4. Existing Cookie Policy

A Cookie Policy page exists at `/legal/cookies` and is accessible from the
platform footer. It documents the storage practices described above.

The Cookie Policy should be reviewed periodically and updated if any of the
trigger conditions below are met.

---

## 5. Future Consent Triggers

A consent banner **will be required** if any of the following are added:

| Trigger | Example |
|---|---|
| Analytics SDK | Google Analytics 4, Mixpanel, Amplitude |
| Advertising pixels | Meta Pixel, Google Ads, TikTok Pixel |
| Session recording | Hotjar, FullStory, LogRocket |
| A/B testing | VWO, Optimizely, Google Optimize |
| Third-party chat | Intercom, Crisp, Zendesk |
| Social share tracking | Facebook, Twitter/X widgets |
| HTTP cookies for auth | Switching from localStorage to `HttpOnly` session cookies |

**Engineering governance requirement**: Any PR that introduces a third-party
script or SDK must include a storage/consent impact assessment before merge.

---

## 6. Decision Record

| Item | Decision |
|---|---|
| Consent banner | Not implemented — no consent required under current implementation |
| Legal basis | Strictly necessary functional storage (ePrivacy Art. 5(3)), Contract performance (DPDP Act S.7(b)) |
| Cookie Policy page | Exists at `/legal/cookies` |
| Review cadence | Quarterly, or on any PR introducing third-party scripts |
| Decision owner | Engineering Governance Owner |
| Decision date | 2026-06-27 |
