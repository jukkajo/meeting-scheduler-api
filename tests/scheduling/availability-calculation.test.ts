import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveCandidateIntervals,
  findAvailablePeople,
  findRelevantAvailabilityBoundaries,
  rangesOverlap,
  verifyAuthoritativeCoverage,
} from "../../src/scheduling/availability-calculation.js";
import type { Person, PersonId } from "../../src/scheduling/model/person.js";
import type {
  PersonAvailability,
  TimeRange,
} from "../../src/scheduling/model/time.js";
import { AvailabilityCoverageError } from "../../src/shared/application-errors.js";

test("uses half-open overlap semantics", () => {
  assert.equal(rangesOverlap(range("09:00", "10:00"), range("10:00", "11:00")), false);
  assert.equal(rangesOverlap(range("09:00", "10:00"), range("09:30", "10:30")), true);
});

test("derives candidate intervals from relevant request, coverage, and busy boundaries", () => {
  const requestedRange = range("09:00", "12:00");
  const availabilityByPersonId = availabilityMap([
    availability("alice@example.com", "08:00", "13:00", [
      range("08:00", "09:00"),
      range("09:00", "10:00"),
      range("11:00", "12:00"),
      range("12:00", "13:00"),
    ]),
  ]);

  const boundaries = findRelevantAvailabilityBoundaries(
    requestedRange,
    availabilityByPersonId,
  );
  const candidates = deriveCandidateIntervals(boundaries);

  assert.deepEqual(boundaries.map(formatTime), ["09:00", "10:00", "11:00", "12:00"]);
  assert.deepEqual(
    candidates.map(({ start, end }) => [formatTime(start), formatTime(end)]),
    [
      ["09:00", "10:00"],
      ["10:00", "11:00"],
      ["11:00", "12:00"],
    ],
  );
});

test("excludes a busy person but includes one whose busy interval ends at the candidate start", () => {
  const alice = person("alice@example.com");
  const bob = person("bob@example.com");
  const peopleById = peopleMap([bob, alice]);
  const availabilityByPersonId = availabilityMap([
    availability(alice.personId, "09:00", "12:00", [range("09:00", "10:00")]),
    availability(bob.personId, "09:00", "12:00", [range("10:00", "10:30")]),
  ]);

  assert.deepEqual(
    findAvailablePeople(
      range("10:00", "11:00"),
      peopleById,
      availabilityByPersonId,
    ).map(({ personId }) => personId),
    [alice.personId],
  );
});

test("does not treat a person's uncovered time as free", () => {
  const alice = person("alice@example.com");
  const bob = person("bob@example.com");
  const availabilityByPersonId = availabilityMap([
    availability(alice.personId, "09:00", "10:00"),
    availability(bob.personId, "09:00", "12:00"),
  ]);

  assert.deepEqual(
    findAvailablePeople(
      range("10:00", "11:00"),
      peopleMap([alice, bob]),
      availabilityByPersonId,
    ).map(({ personId }) => personId),
    [bob.personId],
  );
});

test("combines adjacent coverage partitions for the same person", () => {
  const alice = person("alice@example.com");
  const availabilityByPersonId = availabilityMap([
    availability(alice.personId, "09:00", "10:00"),
    availability(alice.personId, "10:00", "11:00"),
  ]);

  verifyAuthoritativeCoverage(range("09:00", "11:00"), availabilityByPersonId);
  assert.deepEqual(
    findAvailablePeople(
      range("09:00", "11:00"),
      peopleMap([alice]),
      availabilityByPersonId,
    ),
    [alice],
  );
});

test("rejects a requested range with a gap in all authoritative coverage", () => {
  const availabilityByPersonId = availabilityMap([
    availability("alice@example.com", "09:00", "10:00"),
    availability("alice@example.com", "10:30", "12:00"),
  ]);

  assert.throws(
    () => verifyAuthoritativeCoverage(range("09:00", "12:00"), availabilityByPersonId),
    AvailabilityCoverageError,
  );
});

function range(start: string, end: string): TimeRange {
  return {
    start: new Date(`2026-01-01T${start}:00.000Z`),
    end: new Date(`2026-01-01T${end}:00.000Z`),
  };
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

function person(personId: PersonId): Person {
  return { personId, skills: [] };
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

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}
