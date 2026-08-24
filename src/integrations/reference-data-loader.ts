import { readFile } from "node:fs/promises";

import type { Person, PersonId } from "../scheduling/model/person.js";
import type {
  BusyInterval,
  PersonAvailability,
} from "../scheduling/model/time.js";
import { parseFreeBusyCalendar } from "./free-busy-calendar.parser.js";
import { parsePeopleDirectory } from "./people-directory.parser.js";

export interface ReferenceDataPaths {
  readonly peopleDirectoryPath: string;
  readonly freeBusyCalendarPath: string;
}

export interface ReferenceData {
  readonly peopleById: ReadonlyMap<PersonId, Person>;
  readonly availabilityByPersonId: ReadonlyMap<
    PersonId,
    readonly PersonAvailability[]
  >;
}

export async function loadReferenceData(
  paths: ReferenceDataPaths,
): Promise<ReferenceData> {
  let peopleSource: string;
  let calendarSource: string;

  try {
    [peopleSource, calendarSource] = await Promise.all([
      readFile(paths.peopleDirectoryPath, "utf8"),
      readFile(paths.freeBusyCalendarPath, "utf8"),
    ]);
  } catch (error) {
    throw new Error(`Failed to read reference data: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  const people = parsePeopleDirectory(peopleSource);
  const availability = parseFreeBusyCalendar(calendarSource);

  return buildReferenceData(people, availability);
}

function buildReferenceData(
  people: readonly Person[],
  availability: readonly PersonAvailability[],
): ReferenceData {
  const peopleById = new Map<PersonId, Person>();
  const mutableAvailability = new Map<PersonId, PersonAvailability[]>();

  for (const person of people) {
    peopleById.set(person.personId, person);
    mutableAvailability.set(person.personId, []);
  }

  for (const partition of availability) {
    const personPartitions = mutableAvailability.get(partition.personId);

    if (personPartitions === undefined) {
      throw new Error(
        `Invalid reference data: calendar identity "${partition.personId}" does not exist in the people directory`,
      );
    }

    personPartitions.push(sortBusyIntervals(partition));
  }

  const availabilityByPersonId = new Map<
    PersonId,
    readonly PersonAvailability[]
  >();

  for (const [personId, partitions] of mutableAvailability) {
    partitions.sort(compareAvailability);
    availabilityByPersonId.set(personId, Object.freeze(partitions));
  }

  return Object.freeze({ peopleById, availabilityByPersonId });
}

function sortBusyIntervals(
  availability: PersonAvailability,
): PersonAvailability {
  const busyIntervals = [...availability.busyIntervals].sort(compareTimeRanges);

  return Object.freeze({
    personId: availability.personId,
    coverage: availability.coverage,
    busyIntervals: Object.freeze(busyIntervals),
  });
}

function compareAvailability(
  left: PersonAvailability,
  right: PersonAvailability,
): number {
  return compareTimeRanges(left.coverage, right.coverage);
}

function compareTimeRanges(
  left: BusyInterval,
  right: BusyInterval,
): number {
  return (
    left.start.getTime() - right.start.getTime() ||
    left.end.getTime() - right.end.getTime()
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
