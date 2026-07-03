# CI Investigation Customization Skill

This directory contains the workspace customization configuration and reference templates for the `ci-investigation` skill.

## Directory Structure

```
ci-investigation/
├── SKILL.md                 # Core instructions and lifecycle workflow for CI/build incident investigations
├── README.md                # Skill layout and onboarding information (this document)
├── CHECKLIST.md             # Actionable diagnostic checklists for human/AI investigators
├── templates/
│   ├── ci-investigation-prompt.md          # Reusable prompt for executing evidence collection
│   ├── github-actions-diagnostics.yml      # Template GHA workflow instrumentation snippet
│   └── evidence-matrix.md                  # Standard report structure for compiling CI vs. local differences
└── examples/
    ├── transpilation-failure.md             # Example: esbuild / tsx transpiler parsing crash
    ├── test-failure.md                      # Example: Integration test timeout or casing error in CI
    ├── deployment-failure.md                # Example: Webpack / Next.js bundling/routing errors in Vercel/Render
    └── dependency-resolution.md             # Example: Lockfile conflicts or node_modules caching anomalies
```

## Setup & Use
AI Agents operating in this repository automatically discover this skill from the `.agents` customizations root. 
- When a build or pipeline check fails, load `SKILL.md` first.
- Refer to `CHECKLIST.md` to run initial terminal diagnostics.
- Copy the templates in `templates/` to isolate and document the issue.
