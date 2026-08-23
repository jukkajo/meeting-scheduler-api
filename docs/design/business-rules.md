
# Business Rules

## Purpose

This document defines scheduling rules derived from the assignment requirements and architectural decisions. Business rules are part of `scheduling-domain concept` and are thereforre independent from transport and data-source formats.

## Meeting Types

### Job Interview

Requirements:

| Rule | Requirement |
|-|-|
| Participants | Exactly 2 |
| Required skills | At least one participant with `recruitment` |

### Sales Meeting

Requirements:

| Rule | Requirement |
|-|-|
| Participants | Exactly 3 |
| Required skills | At least one participant with `sales` |
| Required skills | At least one participant with `software-architecture` |

## Participant Selection

All participant combinations satisfying the selected `meeting rule-set` are considered as valid candidates.

The application does not:
- rank participants
- optimize workload
- select preferred employees or create randomization algorithms

Returned combinations are deterministic. And participants are ordered by `PersonId`, which maps to the person's email address in the initial implementation.

## Suitable Interval Concept

A time interval is suitable when:

- it is inside the requested search window
- the required number of participants are available
- the selected participants satisfy the meeting rules
- the participant set remains valid for the entire intervals

Intervals follow the `half-open representation` `[start, end)`.

## Calendar Availability

The supplied free/busy data is authoritative.

Meaning, that within supported calendar coverage:
- busy periods are unavailable
- periods without busy entries are available.

What is outside of the supported coverage is unknown and should not be interpret optimistically by application as availability.
