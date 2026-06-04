# MAD Entertainment Branch Strategy

## Permanent Branches

### develop

Purpose:

* Active development
* Feature integration
* Internal testing

### live

Purpose:

* Public production releases
* Customer-facing deployments

### main

Purpose:

* Historical production archive
* Legacy release reference

---

## Temporary Branches

### feature/*

Used for:

* New features

### fix/*

Used for:

* Bug fixes
* Security fixes
* Hotfixes

### chore/*

Used for:

* Cleanup
* Maintenance
* Tooling

### audit/*

Used for:

* Verification
* QA audits
* Security reviews

---

## Branch Lifecycle

Create Branch
→ Implement
→ Test
→ Merge into develop
→ Delete Branch

Production Release

develop
→ QA
→ Merge into live
→ Deploy

No temporary branch should remain active after merge.
