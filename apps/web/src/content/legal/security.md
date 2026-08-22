## 1. Security Architecture & Platform Protection

**MAD Entertainment LLC** ("MAD Entertainment," "we," "our") maintains a multi-layered security infrastructure designed to protect customer accounts, ticketing transactions, and personal data against unauthorized access, manipulation, and digital threats.

---

## 2. Technical Safeguards & Encryption Standards

* **Encryption in Transit**: All web sessions, API requests, and webhook endpoints enforce **TLS 1.3** transport encryption with strict HTTP Strict Transport Security (HSTS) headers.
* **Authentication Security**: Support for secure One-Time Passwords (OTP) and OAuth 2.0 Single Sign-On (Google Authentication). Session tokens are stored in secure, `HttpOnly`, `SameSite=Strict` cookies to mitigate cross-site scripting (XSS).
* **Payment Vaulting**: Payment transactions are offloaded directly to **Stripe**, a certified PCI-DSS Level 1 service provider. No sensitive cardholder data is stored on MAD Entertainment servers.
* **Infrastructure Isolation**: Our servers, databases, and microservices are hosted in secure, ISO/IEC 27001 and SOC 2 certified United States data centers with automated network firewalls and DDoS mitigation.

---

## 3. Responsible Vulnerability Disclosure Policy

We value the contributions of independent security researchers and ethical hackers who assist in maintaining our platform's security.

### A. Guidelines for Responsible Research
If you believe you have discovered a security vulnerability in our Platform:
1. Notify us immediately by emailing [security@madentertainments.net](mailto:security@madentertainments.net).
2. Provide sufficient technical details to reproduce the issue (e.g., proof-of-concept scripts, HTTP request logs, or screenshots).
3. Allow us a reasonable timeframe (at least 30 days) to remediate the vulnerability before publicly disclosing details.
4. Do not access, modify, delete, or download data belonging to other users.
5. Do not execute Denial of Service (DoS/DDoS) attacks, automated high-rate volumetric scanners, or physical attacks against our hosting infrastructure.

### B. Safe Harbor Commitment
If you conduct security research in good faith and in full compliance with these guidelines, MAD Entertainment will not pursue legal action against you or request law enforcement investigation.

---

## 4. Reporting a Security Concern

To submit a vulnerability report or security inquiry:

* **Entity**: MAD Entertainment LLC
* **Security Operations Team**: [security@madentertainments.net](mailto:security@madentertainments.net)
* **Urgent Response**: Security vulnerability reports are prioritized and acknowledged within twenty-four (24) hours.
