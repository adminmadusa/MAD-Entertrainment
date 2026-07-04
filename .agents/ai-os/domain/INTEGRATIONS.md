---
title: AI Operating System — Third-Party Integrations
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
supersedes: []
---

# Third-Party Integrations

This document describes the business boundaries, communication formats, and safety rules for external service integrations.

---

## 1. Integrated Platforms

### Stripe (Payment Processing)
* **Domain**: International card transaction execution.
* **Workflows**: Checkout session mapping, card payment validation, refund executions.
* **Webhooks**: Evaluates Stripe payment intent webhook signatures.

### Razorpay (Payment Processing)
* **Domain**: Domestic UPI, card, and netbanking transaction execution.
* **Workflows**: Razorpay order matching, customer checkout redirection, refund processing.
* **Webhooks**: Resolves Razorpay order transaction signature webhooks.

### ZeptoMail (Email Gateway)
* **Domain**: Transactional mail dispatch.
* **Workflows**: OTP dispatches, booking confirmation dispatches with ticket attachments.

### Cloudinary (Media Hosting CDN)
* **Domain**: Binary storage for static assets.
* **Workflows**: Banner picture storage, DJ performer avatar storage.

---

## 2. Invariants & Rules
* **Signature Enforcement**: Webhook callbacks from Stripe and Razorpay must be verified using secure signing secrets before triggering state mutations.
* **Mock Isolation**: In production, mock gateway adapters and sandbox client credentials must be locked out to prevent transaction leakage.
* **Attachment Security**: Ticket PDFs enqueued for ZeptoMail dispatch must be validated for virus/malware signatures before transmission.
