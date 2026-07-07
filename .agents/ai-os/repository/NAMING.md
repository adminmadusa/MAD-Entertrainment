---
title: AI Operating System — Naming & Folder Conventions
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
supersedes: []
---

# Naming & Folder Conventions

This document outlines the naming conventions and structure constraints enforced for files, directories, and branches in the MAD Entertrainment repository.

## Branch Naming Policy
Branch names must comply with the approved formats:
* `feat/<name>`: New features or capabilities.
* `fix/<name>`: Defect fixes.
* `refactor/<name>`: Restructuring existing code without modifying behavior.
* `audit/<name>`: Read-only diagnostic branches. No commits permitted.
* `docs/<name>`: Documentation changes.
* `test/<name>`: Test modifications.
* `chore/<name>`: Maintenance tasks.

## Code File Naming Policies
* **React Components**: PascalCase (e.g. `ProfileEditor.tsx`, `AuthForm.tsx`).
* **React Hooks**: camelCase starting with "use" (e.g. `useAuth.ts`, `useBooking.ts`).
* **Services / Controllers / Routes**: camelCase with file qualifiers (e.g. `booking.service.ts`, `auth.controller.ts`, `team.routes.ts`).
* **Unit Tests**: Matches source file name with `.test.` extension (e.g., `refund.service.test.ts`, `AuthForm.test.tsx`).
* **Domain Documents**: Lowercase (e.g. `lifecycle.md`, `rules.md`).

## Folder Hygiene Rules
To prevent repository clutter, the following folder names are strictly forbidden:
- `temp`
- `temp2`
- `misc`
- `old`
- `backup`
- `new-folder`
- `final`
- `test2`

Every folder must have a defined owner and clear responsibility. Unrelated utilities must not be placed in generic folders.
