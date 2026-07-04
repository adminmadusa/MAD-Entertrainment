---
title: AI Operating System — Math.random IDs Anti-Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/anti-patterns/README.md
supersedes: []
---

# Math.random IDs Anti-Pattern

* **Anti-Pattern ID**: ANT-PFM-001
* **Name**: Use of Math.random for Identifiers
* **Category**: Performance / Security
* **Severity**: High
* **Problem**: Utilizing JavaScript's `Math.random` to generate unique ticket IDs, session tokens, or OTP codes.
* **Symptoms**: Hash collisions (duplicate values) under concurrent transaction loads.
* **Why It Is Harmful**: `Math.random` does not generate cryptographically secure values. Its output sequence is predictable, letting attackers forge active credentials. Additionally, its high collision rates lead to duplicate identifier errors, failing booking transactions.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` lines 35-41: warning on CallExpressions matching `Math.random`).
* **Related Standards**: [PERFORMANCE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/PERFORMANCE.md#STD-PFM-001).
* **Related Architecture**: [SECURITY_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/SECURITY_ARCHITECTURE.md).
* **Related Pattern**: None.
* **Detection Method**:
  - **AI Check**: Scan JS/TS source code files for references to `Math.random()`.
  - **Static Analysis**: ESLint configuration warns on `no-restricted-syntax` matches.
* **Prevention Strategy**: Force developers to utilize Node's native `crypto.randomUUID()` or secure token generators.
* **Refactoring Strategy**: Swap `Math.random()` references with crypto utilities.
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Examples**:
  ```ts
  // BAD: Insecure, predictable random token
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // GOOD: Secure, cryptographically safe token
  const otp = crypto.randomInt(100000, 999999).toString();
  ```
