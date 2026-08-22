# ADR 0001: Modular monolithic architecture

## Status
Accepted

## Context
The assignment names maintainability as the primary design goal while also requiring a small deployment footprint and minimal external dependencies. The application scope is narrow: one REST API calculates suitable meeting times from provided people and calendar data. It does not require booking persistence, distributed processing, independent scaling, or multiple deployment units.

At the same time, concerns such as scheduling rules, canonical models, data integration, HTTP handling, and centralized error handling should remain independently maintainable.

## Decision
Implement the service as a modular monolith: a single runtime and deployment unit with explicit internal boundaries.

Scheduling logic and canonical domain concepts remain independent from HTTP and external data representations. Integration-specific concerns stay at system boundaries, and application-wide concerns such as HTTP error handling may be centralized where appropriate.

New modules or distributed services should only be introduced when distinct capabilities or operational requirements justify them.

## Rationale
This provides enough separation to keep changes local without introducing infrastructure or abstraction that is not required. Scheduling rules can evolve independently from HTTP and file parsing, while the service remains simple to build, run, test, and deploy.

## Alternatives Considered
- Use an unstructured monolith. Simpler initially, but increases coupling between HTTP, parsing, and scheduling concerns.
- Split concerns into microservices. Provides independent deployment and scaling, but neither is required and it would add unnecessary operational complexity.
- Use a strict enterprise-style layered architecture. Provides stronger formal separation, but introduces more abstractions than the current scope justifies.

## Consequences
The service remains a single deployable unit with clear internal responsibility boundaries. Changes should mostly remain local to the affected module or integration boundary. Modules still share one runtime and deployment lifecycle, and maintaining those boundaries relies on project structure and development discipline.