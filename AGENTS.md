# AGENTS.md

## Project's Intent

Implement the meeting-scheduler as a small maintainable modular monolithic API. Prefer the simplest correct implementation which satisfies the assignment and accepted architecture. Do not introduce abstractions or infrastructure for hypothetical future requirements.

## The Source of Truth

Before making changes that affect behavior, structure, or architecture, inspect the relevant repository documentation:

- `docs/anonymized-assignment.md`
- `docs/adr/`
- `docs/design/`
- `CONTRIBUTING.md`

Accepted ADRs and design documents should remain authoritative.

Do not silently re-interpret or replace an accepted architectural decision. If the requested implementation materially conflicts with an accepted decision, report and explain the conflict clearly, before changing the architecture. Do not duplicate existing business rules or contracts into new documentation unless required.

## Architecture Boundaries

Keep responsibility separated as follows:

- `src/http/` owns HTTP validation, request/response translation, routing, and HTTP error mapping.
- `src/scheduling/` owns suitable-time search, availability calculations, participant selection, and business-rule evaluation.
- `src/scheduling/model/` owns canonical, source-independent scheduling concepts.
- `src/integrations/` owns external data loading, parsing, validation, canonicalization, and identity resolution.
- `src/server.ts` is the application composition/startup boundary.
- `src/shared/` contains only genuinely shared application-level concepts.

Scheduling code must not depend on:

- HTTP framework types
- filesystem paths
- raw source JSON structures
- RFC5545/iCalendar objects
- Docker/runtime deployment concepts
- storage-specific concepts

Prefer this dependency flow:

`HTTP -> Scheduling -> Canonical Model`

`Integrations -> Canonical Model`

`Server -> Integrations + HTTP`

## Scheduling Semantics

Preserve the scheduling semantics defined by the accepted ADRs and design documents.

Important Rules:

- use UTC
- treat time ranges as half-open `[start, end)`
- preserve authoritative availability coverage
- do not infer uncovered time as free
- support multiple availability coverage partitions per person
- use deterministic participant selection
- allow one participant to satisfy multiple required skills where the business rules permit it
- produce continuous/maximal suitable intervals for a stable participant set
- merge adjacent suitable intervals only when the selected participant set is equivalent
- do not create or persist bookings

Do not reduce canonical availability to only `PersonId -> BusyInterval[]` if doing so loses coverage information. Read the `docs/design/business-rules.md` for the authoritative meeting requirements rather than duplicating them here.

## Implementation Approach

Prefer:

- explicit domain-specific TypeScript
- small focused functions
- immutable/read-only canonical data where practical
- simple in-memory data structures and collection operations
- deterministic behavior
- startup grouping or indexing where it avoids unnecessary repeated work
- minimal viable production dependencies

Keep abstractions proportional to current requirements.

Do not introduce:

- persistence or query abstractions without a current persistence requirement
- unnecessary architectural layers or wrapper abstractions
- infrastructure for hypothetical future requirements
- generalized solutions where a small domain-specific implementation is sufficient

## Change Scope

Keep each task narrowly scoped.

Do not:

- implement functionality belonging to a later phase unless required by the current change
- perform unrelated cleanup
- rename or restructure modules without a concrete reason
- create files solely for structural symmetry
- replace working explicit code with a generalized abstraction without demonstrated benefit

Preserve established terminology and concepts. When a simpler implementation satisfies the same requirement and architecture, prefer it.

## Testing

Add or update tests for meaningful behavior introduced by the current change.

Prioritize tests around:

- mandatory scheduling rules
- authoritative coverage
- half-open interval boundaries
- deterministic participant selection
- suitable-interval construction and merging
- parser validation and canonicalization
- HTTP validation and error contracts when applicable

Do not add tests that only restate TypeScript type declarations. Run the repository's existing relevant validation commands after introducing changes. Do not add tooling solely to perform validation, unless the project clearly needs it.

## Documentation

Update documentation, when a change makes existing documentation materially incorrect or introduces user/developer-facing behavior that needs explanation. Do not mirror implementation details into ADRs or design documents, those files should stay relatively
stable for MVP. Do not create a new ADR for ordinary implementation choices or for choosing not to introduce an unnecessary abstraction. Keep docs/ai-usage.md concise and factual, documenting only material AI-assisted work.

## Before Completing a Task

Verify following checklist:

1. the requested scope is implemented
2. accepted architecture is preserved
3. source-specific and HTTP concerns have not leaked into scheduling
4. canonical availability information has not been lost
5. no unnecessary abstraction or dependency was introduced
6. important new behavior is tested
7. relevant validation commands pass
8. unrelated files were not changed

Prefer a small, understandable, a correct patch over a broader generalized solution.