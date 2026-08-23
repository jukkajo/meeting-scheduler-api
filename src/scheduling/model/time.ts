import type { PersonId } from "./person.js";

/** A UTC time range with half-open semantics: [start, end). */
export interface TimeRange {
  readonly start: Date;
  readonly end: Date;
}

export type BusyInterval = TimeRange;

/**
 * Authoritative availability for one person within one coverage partition.
 * Multiple values may describe separate coverage partitions for the same person.
 */
export interface PersonAvailability {
  readonly personId: PersonId;
  readonly coverage: TimeRange;
  readonly busyIntervals: readonly BusyInterval[];
}

export function createTimeRange(start: Date, end: Date): TimeRange {
  const startTime = start.getTime();
  const endTime = end.getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new RangeError("Time range boundaries must be valid dates");
  }

  if (startTime >= endTime) {
    throw new RangeError("Time range start must be before end");
  }

  return { start, end };
}
