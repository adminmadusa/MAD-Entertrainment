---
title: AI Operating System — Import Aliasing & Path Policies
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
  - .agents/ai-os/repository/WORKSPACES.md
supersedes: []
---

# Import Aliasing & Path Policies

This document outlines the TypeScript path aliasing configurations and dependency import rules in the MAD Entertrainment monorepo.

## Path Aliasing Configuration
Path mappings are configured globally inside `tsconfig.base.json` to enable clean package exports and resolve dependencies cleanly:
```json
"paths": {
  "@mad/shared": ["./packages/shared/src"],
  "@mad/shared/*": ["./packages/shared/src/*"],
  "@mad/types": ["./packages/types/src"],
  "@mad/types/*": ["./packages/types/src/*"],
  "@mad/ui": ["./packages/ui/src"],
  "@mad/ui/*": ["./packages/ui/src/*"],
  "@mad/utils": ["./packages/utils/src"],
  "@mad/utils/*": ["./packages/utils/src/*"],
  "@mad/validations": ["./packages/validations/src"],
  "@mad/validations/*": ["./packages/validations/src/*"]
}
```

## Import Policies & Best Practices
1. **Forbidden Relative Imports**: Workspaces are prohibited from importing code from another workspace using relative directory paths (e.g., `import { User } from "../../../packages/types/src"`). They must import via the declared alias (e.g. `import { User } from "@mad/types"`).
2. **Circular Dependency Prohibition**: Circular package references are strictly forbidden. Libraries must align to a strict dependency hierarchy (e.g. types cannot import from utils; utils cannot import from ui).
3. **No Direct Node Modules Resolving**: Inter-workspace library packages should resolve using the `workspace:*` prefix to prevent local caching and lockfile duplication.
