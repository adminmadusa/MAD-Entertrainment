---
id: pr-template
version: 1
output: markdown
---
# PR: {{TITLE}}

## Description
{{DESCRIPTION}}

## Checklist
- [ ] Code compiles cleanly (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] Documentation complies with patterns (`pnpm governance:docs`)
- [ ] Merged branch cleaned up (`pnpm governance:cleanup`)
