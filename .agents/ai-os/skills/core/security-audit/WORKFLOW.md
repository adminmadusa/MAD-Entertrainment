# Security Audit Workflow

1. **Load Payment Integrations**: Scans code files in Stripe/Razorpay adapters folders.
2. **Scan Mock Tokens**: Searches for string patterns containing `mock` or `test` transaction prefixes.
3. **Verify Environment Checks**: Checks if these codes verify `process.env.NODE_ENV === 'production'` to block execution on live clusters.
4. **Audit Webhook Signatures**: Checks webhook callback routes parse headers against cryptographic signature verification helper functions.
