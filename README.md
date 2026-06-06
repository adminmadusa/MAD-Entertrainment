# MAD Entertrainment

## Overview

This repository contains the MAD Entertrainment application.

## Developer Workflow

Before starting work:

1. Check the current active implementation task.
2. Complete QA, review, PR, merge, branch cleanup, and develop sync before starting a new implementation stream.
3. Read `AGENTS.md` before using an AI coding agent.

## AI Agent Instructions

AI agents must follow the rules in:

- `AGENTS.md`

Agents should not edit high-risk areas such as payment, auth, security, upload, database, deployment, or environment logic without approval.

## Testing

See:

- `TESTING.md`

## Governance

Before adding new tooling, review existing governance checks:

- `scripts/ci_governance_check.ts`