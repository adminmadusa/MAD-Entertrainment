# Contributing to MAD Entertrainment

- **Owner**: Repository Governance Owner
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing
- **Last Updated**: 2026-07-01
- **Related Documents:**
  - [README.md](README.md)
  - [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md)
  - [AGENTS.MD](AGENTS.MD)

---

## Welcome

Thank you for contributing to MAD Entertrainment! To maintain the quality, correctness, and security of this codebase, we enforce a strict repository governance policy. 

Please read this document carefully before making your first commit.

---

## 1. Prerequisites & Setup

Ensure your local workstation has the correct tooling:
- **Node.js**: `v20.x.x` (LTS)
- **Package Manager**: `pnpm@9.15.0`

### Initial Installation
```bash
# Clone the repository
git clone https://github.com/adminmadusa/MAD-Entertrainment.git
cd MAD-Entertrainment

# Install workspace dependencies
pnpm install --frozen-lockfile
```

---

## 2. Developer Workflow (The One Task Rule)

To prevent merge conflicts and staging issues:
1. **Identify the current active implementation task** (via issues or backlog).
2. **Verify no other task is awaiting integration** (verification, PR review, merge, branch cleanup, develop sync).
3. **Only one active implementation branch** is allowed at a time. Do not stack branches or commits.

---

## 3. Branching Strategy

Protected branches are `develop` and `live`. Direct commits are blocked.

### Task Branches
Always branch off the latest `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feat/my-feature-name
```

Allowed branch prefixes:
- `feat/` — New capabilities
- `fix/` — Defect repairs
- `refactor/` — Code restructuring (no behavior changes)
- `docs/` — Documentation modifications
- `test/` — Test updates or additions
- `chore/` — Maintenance / CI updates
- `seo/` — Search engine optimization updates
- `audit/` — Diagnostics & discovery (**Strictly Read-Only**)

---

## 4. Verification Checklist (Before Opening a PR)

Before staging files or creating a PR, run the local verification suite:
```bash
# Lint all workspaces
pnpm lint

# Check TypeScript compiler validity
pnpm type-check

# Compile production builds
pnpm build

# Execute Unit and Integration test suites
pnpm test

# Run governance document compliance scans
pnpm run governance:docs
```

Any compilation failure, lint warning, test failure, or governance violation will fail CI and block merges. Do not ignore failures.

---

## 5. Pull Request Guidelines

1. **Keep Changes Focused**: Each PR must address exactly one problem category (1 Issue = 1 Branch = 1 PR). No cross-cutting refactors.
2. **PR Template**: Complete the 11-question quality gate check located in `PULL_REQUEST_TEMPLATE.md`.
3. **Documentation**: Update respective SSOT documents (e.g. `API_CONTRACTS.md`, `ARCHITECTURE.md`) in tandem with code changes.
4. **Rollback Plan**: Always document a rollback strategy for any operational changes.
5. **CODEOWNERS**: Appropriate code owners will be assigned automatically based on modified paths.
