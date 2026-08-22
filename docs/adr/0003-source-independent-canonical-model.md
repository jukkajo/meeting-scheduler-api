# ADR 0003: Source-independent canonical model

## Status
Accepted

## Context
The input sources describe related scheduling data in unrelated structures: the people JSON uses directory fields, while the calendar uses RFC 5545 names such as `ORGANIZER` and `FREEBUSY`. HTTP query parameters add a third representation. If scheduling rules operate on any of those shapes, source concerns leak into the core logic and make the behavior harder to test or generalize.

## Decision
Scheduling logic should operate only on the application core concepts established under `src/modules/scheduling/model`. File integrations translate JSON records and calendar entries into those concepts, including resolving calendar organizers to canonical people. HTTP and any future database or REST integration must likewise map data to the same model rather than change the scheduling logic. The canonical model contains no JSON field-shape, RFC 5545, HTTP, or storage-schema terminology. Canonical model should use common persisting solution principles and follow sql table like responsibility division to enhance maintainability and to allow implementing persisting solution painlessly in the future.

## Rationale
These minimal viable types express exactly what the configured participant-count and required-skill rules need. Keeping them source-independent gives the scheduling algorithm one stable source of truth and permits focused domain tests without files or HTTP. It also confines representation changes to their integration boundary.

## Alternatives Considered
- Run scheduling directly on parsed JSON and ICS objects. This would avoid an initial mapping step but couples the algorithm to both formats and mixes organizer resolution with availability calculations.
- Use generic dictionaries or untyped records as a shared format. This appears flexible but loses explicit invariants and shifts format mistakes into runtime scheduling behavior.

## Consequences
Scheduling code remains independent of transport and storage choices, and new sources can participate by producing the same canonical values. Each integration needs an explicit mapping and tests, and source details not represented canonically are intentionally discarded. Changes to canonical concepts can still require coordinated updates across all integrations.
