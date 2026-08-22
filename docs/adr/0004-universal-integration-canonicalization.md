# ADR 0004: Universal integration canonicalization

## Status
Accepted

## Context
JSON files, iCalendar content, REST responses, and database rows have different parsing rules and failure modes, but equivalent valid inputs should produce equivalent canonical scheduling values. A single generic parser abstraction would obscure those differences, while duplicating common normalization in every integration could make identity and time-range behavior inconsistent.

## Decision
Each integration owns parsing and structural validation for its representation. After that boundary, source-independent canonicalization and invariant checks are shared where the rule is genuinely common, such as producing canonical person identities and valid time ranges. Shared components must have a named scheduling responsibility; unrelated helpers must not accumulate in a generic utilities module. Integrations are not required to implement or pass through one universal parser interface.

## Rationale
This split keeps format knowledge with the code that can explain its errors while enforcing the same domain meaning after parsing. It supports the supplied file integrations and leaves a clear path for another source to produce the existing model without pretending that a JSON document, an RFC 5545 component, and a database row are parsed alike.

## Alternatives Considered
- Force every source through a generic parser or record adapter. The common surface would be superficial, become complex fast and would either leak source-specific options or weaken validation.
- Let every integration perform all normalization independently. This is initially simple but risks different identity, timestamp, and interval rules for equivalent data.
- Put all conversion helpers in a shared utility module. That reduces file count but hides ownership and encourages unrelated representation and domain logic to mix.

## Consequences
Source-specific errors remain precise while canonical invariants can be reused and tested once. Adding an integration requires both its own parser or reader and an explicit canonical mapping. The boundary requires judgment, over-sharing can recreate a generic parser, while under-sharing can allow normalization behavior to drift.
