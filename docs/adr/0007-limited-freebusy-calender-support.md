# ADR 0007: Limited iCalendar free/busy support

## Status
Accepted

## Context
The supplied ICS data is one `VCALENDAR` containing `VFREEBUSY` components. Those components identify people with `ORGANIZER` populated by emails and express busy periods as UTC `FREEBUSY` start/end pairs. A general RFC 5545 implementation covers substantially more behavior than this read-only scheduling use case, including events, recurrence, invitations, alarms, writes, local-time rules and so on.

## Decision
Applidation should support the RFC 5545/iCalendar subset required to read the supplied free/busy dataset: the relevant `VCALENDAR` and `VFREEBUSY` structure, organizer identity, and UTC free/busy periods. The required structure, UTC timestamp syntax, interval ordering, and organizer resolution need validation before producing canonical `BusyInterval` values. No claim for support of general calendar processing, `VEVENT`, recurrence, alarms, invitations, calendar writes, or timezone-database conversion is made. Unsupported constructs are outside the input contract rather than being interpreted speculatively.

`VFREEBUSY`, `DTSTART` and `DTEND` define the period for which the partition's free/busy information is authoritative. Within that coverage, time not represented by a supported `FREEBUSY` period is considered available. Time outside the published coverage is unknown and must not be inferred by application to be available. A requested search window must be fully covered by the supplied free/busy data for request to be evaluated.

## Rationale
A focused iCalendar parser can strictly validate only the data scheduling actually consumes while keeping dependencies and maintenance proportional to the assignment's scope. Translating immediately to `PersonId` and `BusyInterval` prevents RFC 5545 terminology from spreading into the scheduling model. Restricting input to UTC matches both the supplied dataset and the API's UTC search window.

## Alternatives Considered
- Adopt a full-featured calendar library and expose its model internally. This offers broader RFC coverage but adds unused behavior and couples scheduling to a third-party representation.
- Parse all calendar component types. The API needs busy availability only; event creation and recurrence would introduce unrelated semantics.
- Treat the file as unchecked delimiter-separated text. This is smaller initially but would accept malformed structure or timestamps and produce unreliable intervals.

## Consequences
The application has a small, auditable calendar boundary tailored to the supplied data and canonical model. It will not accept many otherwise valid iCalendar features, including local times and recurring events, without deliberate extension. Maintaining a focused parser still requires tests for the supported RFC content-line and interval cases, and broader interoperability would justify revisiting the dependency choice.
