import { AvailabilityCoverageError } from "../shared/application-errors.js";
import type { Person, PersonId } from "./model/person.js";
import {
  createTimeRange,
  type PersonAvailability,
  type TimeRange,
} from "./model/time.js";

export type AvailabilityByPersonId = ReadonlyMap<
  PersonId,
  readonly PersonAvailability[]
>;

/**
 * Verifies that the full requested range falls within the union of published
 * availability coverage. Individual people still need authoritative coverage
 * for a candidate interval before they can be considered available.
 */
export function verifyAuthoritativeCoverage(
  requestedRange: TimeRange,
  availabilityByPersonId: AvailabilityByPersonId,
): void {
  const coverageRanges = [...availabilityByPersonId.values()]
    .flat()
    .map(({ coverage }) => coverage);

  if (!isRangeCovered(requestedRange, coverageRanges)) {
    throw new AvailabilityCoverageError();
  }
}

/** Returns the ordered search, coverage, and busy boundaries inside a request. */
export function findRelevantAvailabilityBoundaries(
  requestedRange: TimeRange,
  availabilityByPersonId: AvailabilityByPersonId,
): readonly Date[] {
  const startTime = requestedRange.start.getTime();
  const endTime = requestedRange.end.getTime();
  const boundaries = new Map<number, Date>([
    [startTime, requestedRange.start],
    [endTime, requestedRange.end],
  ]);

  for (const partitions of availabilityByPersonId.values()) {
    for (const partition of partitions) {
      addInternalBoundary(boundaries, partition.coverage.start, startTime, endTime);
      addInternalBoundary(boundaries, partition.coverage.end, startTime, endTime);

      for (const busyInterval of partition.busyIntervals) {
        if (!rangesOverlap(requestedRange, busyInterval)) {
          continue;
        }

        addInternalBoundary(boundaries, busyInterval.start, startTime, endTime);
        addInternalBoundary(boundaries, busyInterval.end, startTime, endTime);
      }
    }
  }

  return [...boundaries.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, boundary]) => boundary);
}

export function deriveCandidateIntervals(
  boundaries: readonly Date[],
): readonly TimeRange[] {
  const candidateIntervals: TimeRange[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];

    if (start !== undefined && end !== undefined) {
      candidateIntervals.push(createTimeRange(start, end));
    }
  }

  return candidateIntervals;
}

/** Returns canonical people who are known to be free for the whole interval. */
export function findAvailablePeople(
  candidateInterval: TimeRange,
  peopleById: ReadonlyMap<PersonId, Person>,
  availabilityByPersonId: AvailabilityByPersonId,
): readonly Person[] {
  return [...peopleById.values()]
    .filter((person) => {
      const partitions = availabilityByPersonId.get(person.personId) ?? [];

      return (
        isRangeCovered(
          candidateInterval,
          partitions.map(({ coverage }) => coverage),
        ) &&
        partitions.every(({ busyIntervals }) =>
          busyIntervals.every(
            (busyInterval) => !rangesOverlap(candidateInterval, busyInterval),
          ),
        )
      );
    })
    .sort((left, right) => comparePersonIds(left.personId, right.personId));
}

export function rangesOverlap(left: TimeRange, right: TimeRange): boolean {
  return (
    left.start.getTime() < right.end.getTime() &&
    right.start.getTime() < left.end.getTime()
  );
}

function isRangeCovered(
  range: TimeRange,
  coverageRanges: readonly TimeRange[],
): boolean {
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  let coveredUntil = rangeStart;

  const relevantCoverage = coverageRanges
    .filter(
      (coverage) =>
        coverage.start.getTime() < rangeEnd &&
        coverage.end.getTime() > rangeStart,
    )
    .sort(
      (left, right) =>
        left.start.getTime() - right.start.getTime() ||
        left.end.getTime() - right.end.getTime(),
    );

  for (const coverage of relevantCoverage) {
    const coverageStart = coverage.start.getTime();

    if (coverageStart > coveredUntil) {
      return false;
    }

    coveredUntil = Math.max(coveredUntil, coverage.end.getTime());

    if (coveredUntil >= rangeEnd) {
      return true;
    }
  }

  return false;
}

function addInternalBoundary(
  boundaries: Map<number, Date>,
  boundary: Date,
  rangeStart: number,
  rangeEnd: number,
): void {
  const boundaryTime = boundary.getTime();

  if (boundaryTime > rangeStart && boundaryTime < rangeEnd) {
    boundaries.set(boundaryTime, boundary);
  }
}

function comparePersonIds(left: PersonId, right: PersonId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
