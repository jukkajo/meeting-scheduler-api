# ADR 0005: Centralized HTTP error contract

## Status
Accepted

## Context
The `/meeting-slots` endpoint must validate a meeting type and UTC search-window bounds, and scheduling can report known application failures. If each route constructs responses independently, status codes and public error bodies can diverge. Unexpected failures also risk exposing stack traces or source-data details. Failures while loading reference files occur before the HTTP service is usable and are a separate concern.

## Decision
Define one HTTP-facing error body contract and one centralized mapping at the HTTP boundary. Known request-validation and application failures map to appropriate client-error responses. Unexpected failures during request processing map to a stable `500`-status response that does not expose internal details. Startup parsing, validation, and canonicalization failures bypass this mapping and fail application startup. A small set of meaningful error categories should be preferred instead of an exception class for every failure case.

A valid request, that produces no suitable meeting intervals is understood as a successful request and is represented as an empty result, not as an HTTP error. Invalid client input is mapped consistently to client-error responses, while unexpected request-time failures are mapped to stable and non-leaking server-error response. The concrete public schemas and status mappings are defined by the API and error-design contracts.

## Rationale
A single boundary gives API clients a predictable status and body semantics while allowing scheduling code to describe failures without knowing HTTP. Separating startup failures preserves fail-fast oriented reference-data loading and avoids presenting a broken deployment as a client request error. A compact error model is sufficient for this single-endpoint assignment while staying maintainable for further development.

## Alternatives Considered
- Build error responses inside each route. This is direct and simple, but it duplicates policy and makes future endpoints prone to inconsistent behavior.
- Return `400` for every failure. This incorrectly attributes server defects to the caller and makes operational problems harder to distinguish.
- Create a deep hierarchy of custom exceptions. It can encode fine distinctions, but adds excess and little to no value structures and coupling beyond the few mappings this API needs.

## Consequences
Clients receive consistent, non-leaking errors and route handlers stay focused on request translation. The central mapper becomes a policy point that must be updated when a new known failure is introduced. Stable public `500` responses intentionally omit diagnostic detail, so internal diagnostics must be handled separately. Startup errors remain process-level failures rather than HTTP-layer responses.
