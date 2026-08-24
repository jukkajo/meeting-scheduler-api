import assert from "node:assert/strict";
import test from "node:test";

import { findSuitableTimes } from "../../src/scheduling/find-suitable-times.js";
import { meetingRules } from "../../src/scheduling/model/meeting-rules.js";
import type { Person, PersonId } from "../../src/scheduling/model/person.js";
import type {
  PersonAvailability,
  TimeRange,
} from "../../src/scheduling/model/time.js";
import { AvailabilityCoverageError } from "../../src/shared/application-errors.js";

test("merges adjacent candidate intervals when the selected participant set is equivalent", () => {
  const people = [
    person("alice@example.com", ["recruitment"]),
    person("bob@example.com", []),
    person("charlie@example.com", []),
  ];
  const availability = [
    availableAllSearch(people[0]!),
    availableAllSearch(people[1]!),
    availableAllSearch(people[2]!, [range("10:00", "11:00")]),
  ];

  assert.deepEqual(
    findSuitableTimes(
      range("09:00", "12:00"),
      meetingRules["job-interview"],
      peopleMap(people),
      availabilityMap(availability),
    ),
    [
      {
        start: at("09:00"),
        end: at("12:00"),
        selectedParticipantIds: ["alice@example.com", "bob@example.com"],
      },
    ],
  );
});

test("preserves an active participant set across an availability expansion", () => {
  const people = [
    person("alice@example.com", []),
    person("bob@example.com", ["recruitment"]),
    person("charlie@example.com", []),
  ];
  const availability = [
    availableAllSearch(people[0]!, [range("09:00", "10:00")]),
    availableAllSearch(people[1]!),
    availableAllSearch(people[2]!),
  ];

  assert.deepEqual(
    findSuitableTimes(
      range("09:00", "11:00"),
      meetingRules["job-interview"],
      peopleMap(people),
      availabilityMap(availability),
    ),
    [
      {
        start: at("09:00"),
        end: at("11:00"),
        selectedParticipantIds: ["bob@example.com", "charlie@example.com"],
      },
    ],
  );
});

test("does not merge adjacent intervals when the selected participant set changes", () => {
  const people = [
    person("alice@example.com", ["recruitment"]),
    person("bob@example.com", []),
    person("charlie@example.com", ["recruitment"]),
  ];
  const availability = [
    availableAllSearch(people[0]!, [range("10:00", "11:00")]),
    availableAllSearch(people[1]!),
    availableAllSearch(people[2]!),
  ];

  assert.deepEqual(
    findSuitableTimes(
      range("09:00", "11:00"),
      meetingRules["job-interview"],
      peopleMap(people),
      availabilityMap(availability),
    ),
    [
      {
        start: at("09:00"),
        end: at("10:00"),
        selectedParticipantIds: ["alice@example.com", "bob@example.com"],
      },
      {
        start: at("10:00"),
        end: at("11:00"),
        selectedParticipantIds: ["bob@example.com", "charlie@example.com"],
      },
    ],
  );
});

test("returns no suitable result when no available combination satisfies the rule", () => {
  const people = [person("alice@example.com", []), person("bob@example.com", [])];
  const availability = people.map((value) => availableAllSearch(value));

  assert.deepEqual(
    findSuitableTimes(
      range("09:00", "11:00"),
      meetingRules["job-interview"],
      peopleMap(people),
      availabilityMap(availability),
    ),
    [],
  );
});

test("reports an application error when the requested range is not authoritatively covered", () => {
  const alice = person("alice@example.com", ["recruitment"]);

  assert.throws(
    () =>
      findSuitableTimes(
        range("09:00", "12:00"),
        meetingRules["job-interview"],
        peopleMap([alice]),
        availabilityMap([
          availability(alice.personId, "09:00", "10:00"),
          availability(alice.personId, "11:00", "12:00"),
        ]),
      ),
    AvailabilityCoverageError,
  );
});

function at(time: string): Date {
  return new Date(`2026-01-01T${time}:00.000Z`);
}

function range(start: string, end: string): TimeRange {
  return { start: at(start), end: at(end) };
}

function person(personId: PersonId, skills: readonly string[]): Person {
  return { personId, skills };
}

function availableAllSearch(
  value: Person,
  busyIntervals: readonly TimeRange[] = [],
): PersonAvailability {
  return availability(value.personId, "09:00", "12:00", busyIntervals);
}

function availability(
  personId: PersonId,
  start: string,
  end: string,
  busyIntervals: readonly TimeRange[] = [],
): PersonAvailability {
  return {
    personId,
    coverage: range(start, end),
    busyIntervals,
  };
}

function peopleMap(people: readonly Person[]): ReadonlyMap<PersonId, Person> {
  return new Map(people.map((value) => [value.personId, value]));
}

function availabilityMap(
  partitions: readonly PersonAvailability[],
): ReadonlyMap<PersonId, readonly PersonAvailability[]> {
  const grouped = new Map<PersonId, PersonAvailability[]>();

  for (const partition of partitions) {
    const personPartitions = grouped.get(partition.personId) ?? [];
    personPartitions.push(partition);
    grouped.set(partition.personId, personPartitions);
  }

  return grouped;
}
