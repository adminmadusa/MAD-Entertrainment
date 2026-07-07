# Payment Audit Workflow

1. **Locate Checkout Logic**: Scans controllers processing transaction confirmations.
2. **Audit Production Payment locks**: Evaluates if mock prefixes (e.g. `pi_mock_`) check `process.env.NODE_ENV === 'production'`.
3. **Verify Webhook Callback Signatures**: Checks if routing paths verify signature headers against API credentials.
4. **Log violations**: Emits findings for exploits.
