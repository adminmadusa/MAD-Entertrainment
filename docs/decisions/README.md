# Architecture Decision Records (ADRs)

Status: Active  
Version: 1.0  
Owner: Repository Architecture  
Review Cycle: Ongoing  
Last Updated: 2026-06-25  

Related Documents:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/README.md)
- [ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/ARCHITECTURE.md)
- [DEPLOYMENT_MAP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/DEPLOYMENT_MAP.md)
- [API_CONTRACTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/API_CONTRACTS.md)

---

## Executive Overview

### What is an ADR?
An **Architecture Decision Record (ADR)** is a short text document that captures a significant technical decision, its context, and the rationale behind it.

### Why do they exist?
While our core SSOT documents (`ARCHITECTURE.md`, `DEPLOYMENT_MAP.md`, `API_CONTRACTS.md`) explain **what** the system's design is, ADRs document **why** those decisions were made. They prevent knowledge loss, simplify onboarding, provide historical context, and ensure long-term architectural traceability.

---

## ADR Creation Policy

An ADR **must** be created and approved before merging any changes that:
- Change package boundaries or monorepo topology
- Modify deployment topology or hosting providers
- Introduce new infrastructure components or databases
- Change authentication/authorization architecture
- Change payment processing architecture
- Change booking ownership or seating integrity rules
- Introduce breaking API contract schemas
- Modify repository governance rules
- Introduce significant security architecture changes

---

## ADR Lifecycle Status Model

Each decision record transitions through a structured status model:

```mermaid
stateDiagram-v2
    [*] --> Proposed : Proposal Submitted
    Proposed --> Accepted : Approved
    Proposed --> Rejected : Rejected (Terminal State)
    Accepted --> Implemented : Deployed to Production
    Implemented --> Superseded : Replaced by Newer ADR
    Implemented --> Deprecated : Obsolete without Replacement
```

### Transition & Status Rules:
1. **Proposed**: The decision is drafted and under active review.
2. **Accepted**: The decision has been approved by the architecture team but has not yet been fully implemented in the codebase.
3. **Implemented**: The code changes matching the decision are deployed to production.
4. **Rejected**: The proposal was reviewed and rejected. This is a terminal state.
5. **Superseded**: A newer decision (`ADR-XXX`) has been approved that replaces or modifies this decision.
6. **Deprecated**: The decision is obsolete and has been retired without a direct replacement (e.g. when a feature, service, or dependency is completely removed).

---

## ADR Governance & Review Process

### 1. Proposal Phase
- Copy the [ADR_TEMPLATE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/docs/decisions/ADR_TEMPLATE.md) to create a new file named `docs/decisions/ADR-XXX-title.md`.
- Set the status to `Proposed` and fill in the Context, Problem Statement, and Alternatives Considered.

### 2. Review Phase
- Open a Pull Request referencing the proposed ADR.
- Assign appropriate reviewers from the **Decision Ownership Matrix** below.

### 3. Execution Phase
- Once merged, the status shifts to `Accepted`.
- After code implementation is complete, verified, and merged, the status is updated to `Implemented`.

### Decision Ownership Matrix
Architectural review and approvals are divided into operational areas:

| Decision Category | Primary Reviewer / Owner | Relevant SSOT Document |
| :--- | :--- | :--- |
| **Architecture** | Principal Architect | [ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/ARCHITECTURE.md) |
| **Infrastructure & Hosting**| Platform Team | [DEPLOYMENT_MAP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/DEPLOYMENT_MAP.md) |
| **Payments & Payouts** | Financial Domain Tech Lead | [API_CONTRACTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/API_CONTRACTS.md) |
| **Authentication & AuthZ** | Security Architect | [API_CONTRACTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/API_CONTRACTS.md) |
| **Governance & Quality** | Repository Governance Owner | [AGENTS.MD](file:///Users/admin/Desktop/MAD%20Entertrainment/AGENTS.MD) |
