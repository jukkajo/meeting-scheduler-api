# ADR 0002: In-memory data representation

## Status
Accepted

## Context
The assignment supplies the people directory as JSON and availability as an ICS file. Files are relatively small by size. The API is expected to find suitable times. It does not create meetings or require booking persistence. Reading and interpreting both files for every `/meeting-slots` request would add avoidable I/O work and allow malformed reference data to cause request-time failures.

## Decision
It is reasonable to load both supplied files once during application startup. Their integrations will parse and validate the source data, convert it to the canonical scheduling model, and retain the resulting people and busy intervals in memory for request processing. The server must not begin accepting requests if this reference data is invalid. A database, booking store, or write path should not be introduced as the in-memory representation is reloadable runtime data, not persistent state.

## Rationale
The supplied dataset is static and bounded, so startup loading keeps request handling deterministic and focused on scheduling. Failing fast makes configuration and data defects visible at the application boundary instead of producing intermittent HTTP failures. A persistence layer would add schema, migration, and operational work without serving an assignment requirement. Additionally, server booting
time should be justified considering very small dataset
sizes.

## Alternatives Considered
- Parse the files on every request. This would repeat validation and I/O and move reference-data failures into the request path.
- Load lazily on the first request and cache the result. This reduces startup work but lets an unusable application start successfully and makes the first request behave differently.
- Import the data into a database. This could support larger or mutable datasets, but neither is required here and the database would become unnecessary infrastructure considersing assignment's current scope.

## Consequences
Requests use already validated data and need no storage dependency. Invalid source data prevents startup. File changes require a restart, every application instance keeps its own copy, and memory use grows with the dataset. This design cannot provide durable bookings or runtime data updates. Those capabilities are deliberately outside the assignment.
