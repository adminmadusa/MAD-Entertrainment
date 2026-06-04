# MAD Entertainment Release Process

This document outlines the standard release process for MAD Entertainment.

## Release Flow

1. **Active Development**: All feature and fix branches are merged into the `develop` branch.
2. **QA / Verification**: The `develop` branch is stabilized and subjected to internal QA/verification testing.
3. **Release Promotion**: Once QA passes, a pull request is created to merge `develop` into `live`.
4. **Deployment**: Merging into the `live` branch triggers the production deployment pipeline.
5. **Archive**: Historical releases remain accessible via the `main` branch.
