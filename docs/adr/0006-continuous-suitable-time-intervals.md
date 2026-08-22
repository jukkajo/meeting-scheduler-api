# ADR 0006: Continuous suitable time intervals

## Status
Accepted

## Context
The API request supplies a meeting type plus `start` and `end` search bounds. The configured meeting rules define participant counts and required skills, but neither the API nor the rules define a meeting duration or slot granularity. Producing conventional 15-, 30-, or 60-minute slots would therefore invent a new business rules and could discard valid availability.

## Decision
API should return continuous intervals within the requested window during which a participant set satisfying the selected `MeetingRule` is jointly available. Interval boundaries are to be derived from the search bounds and actual busy-period boundaries, not from a fixed time grid. Returned intervals are maximal for a stable participant set and internal logic does not assert a meeting duration.

In practise, all ranges should be treated as half-open, `[start, end)`: the start is included and the end is excluded. Addionally, adjacent intervals with the same valid participant set are merged. An interval ends when the search window ends or when a change in availability means that participant set can no longer satisfy the meeting rule.

## Rationale
Continuous intervals preserve all information supported by the inputs and let a caller apply a fitting duration once one is known. Half-open ranges give unambiguous overlap behavior: a busy period ending exactly when another range starts does not overlap that range. Using actual calendar boundaries also avoids unnecessary iteration across arbitrary slots.

## Alternatives Considered
- Emit fixed-size slots. No slot size is specified, and any chosen value could omit valid start times or imply a duration the assignment does not define.
- Assume a duration per meeting type. The existing `MeetingRule` values contain participant and skill requirements only, so such durations would be unsupported policy.
- Return individual available instants. Instants do not communicate how much continuous time is available and would still require an arbitrary sampling frequency.

## Consequences
The response can represent variable-length availability exactly and handles adjacent boundaries consistently. Consumers must choose a meeting duration and select a subrange themselves. Results may be less immediately convenient than bookable fixed slots, and adding duration-aware booking later would require an additional rule and filtering step.