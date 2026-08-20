# Security Policy

## Overview

MAD Entertrainment takes the security of its platform and the safety of its users
seriously. This document explains which deployments receive security updates and how
to responsibly disclose a vulnerability.

---

## Supported Deployments

Only the **current production deployment** receives active security patches. No legacy
versions or staging environments are in scope for support.

| Service | URL | Actively Maintained |
| --- | --- | --- |
| Public Web | https://www.madentertainments.net | ✅ Yes |
| REST API | https://api.madentertainments.net/api | ✅ Yes |
| Admin Panel | https://www.admin.madentertainments.net | ✅ Yes |
| Staging / Preview | Vercel preview URLs | ❌ No |

---

## Reporting a Vulnerability

> **⚠️ Do NOT open a public GitHub issue for security vulnerabilities.**
> Public disclosure before a fix is available puts all users at risk.

Please report security vulnerabilities by **emailing us privately**:

📧 **support@mad-entertainment.com**

### What to Include

- A clear description of the vulnerability and its potential impact
- The affected URL(s), endpoint(s), or component(s)
- Step-by-step reproduction instructions
- Any supporting evidence (screenshots, HTTP traces, PoC code)
- Your name / handle if you would like to be credited

### Response Timeline

| Milestone | Target |
| --- | --- |
| Acknowledgement of receipt | Within 48 hours |
| Initial severity assessment | Within 5 business days |
| Resolution or remediation plan | Within 14 calendar days |
| Public disclosure (coordinated) | After patch is deployed |

---

## What Happens Next

- **Accepted** — We will work with you on a coordinated disclosure timeline and credit
  you in our [CHANGELOG.md](CHANGELOG.md) once the fix is deployed.
- **Declined** — We will provide a written explanation of why the report does not
  qualify as a security vulnerability in our context.

---

## Scope

The following are **in scope** for vulnerability reports:

- Authentication and authorisation bypass
- Payment and booking data exposure
- Injection attacks (SQL, NoSQL, command, SSTI)
- Cross-site scripting (XSS) in production pages
- Cross-site request forgery (CSRF)
- Insecure direct object references (IDOR)
- Server-side request forgery (SSRF)
- Secrets or credentials leaked in client-side bundles or API responses
- Broken access controls on admin or ticket management endpoints

### Out of Scope

- Vulnerabilities in staging, preview, or local development environments
- Rate limiting / brute-force on non-critical endpoints
- Self-XSS (requires the attacker to attack themselves)
- Missing HTTP security headers rated as "informational" by scanners
- Outdated software versions with no demonstrated exploit path
- Social engineering or phishing attacks against our team
- Physical security issues
- Denial-of-service attacks

---

## Disclosure Policy

MAD Entertrainment follows a **coordinated disclosure** model. We request that
reporters:

1. Give us a reasonable time to investigate and patch before any public disclosure
2. Avoid accessing, modifying, or deleting user data during testing
3. Limit testing to accounts and data you own or have explicit permission to test

We will **not** pursue legal action against researchers who follow this policy in
good faith.

---

*Last updated: 2026-08-20*
