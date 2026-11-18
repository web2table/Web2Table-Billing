# ADR 0001: Start with a modular monolith

- **Status:** Accepted as initial direction
- **Date:** 2026-11-19

## Context

Web2Table needs a standalone internal business application for subscription oversight, collections, reporting, and company expenses. The initial team and expected workload do not justify distributed services and their operational overhead.

## Decision

Build one deployable application organized as a modular monolith with explicit domain boundaries, application service interfaces, and infrastructure adapters.

## Consequences

- Faster and cheaper initial delivery.
- Simpler deployment, observability, and transactions.
- Modules remain independently testable.
- Module boundaries must be enforced to prevent a tightly coupled codebase.
- A module may be extracted later only when a concrete scaling, security, reliability, or ownership need supports it.
