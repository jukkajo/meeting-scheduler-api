import type { PersonId } from "../scheduling/model/person.js";
import {
  createTimeRange,
  type BusyInterval,
  type PersonAvailability,
} from "../scheduling/model/time.js";
import { normalizePersonId } from "./person-identity.js";

const UTC_DATE_TIME_PATTERN =
  /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

interface ContentLine {
  readonly name: string;
  readonly parameters: readonly string[];
  readonly value: string;
  readonly lineNumber: number;
}

interface FreeBusyBuilder {
  organizer?: PersonId;
  start?: Date;
  end?: Date;
  uid?: string;
  stamp?: Date;
  readonly busyIntervals: BusyInterval[];
}

export function parseFreeBusyCalendar(
  source: string,
): readonly PersonAvailability[] {
  const lines = parseContentLines(source);
  const firstLine = lines[0];

  if (
    firstLine === undefined ||
    firstLine.name !== "BEGIN" ||
    firstLine.value.toUpperCase() !== "VCALENDAR" ||
    firstLine.parameters.length !== 0
  ) {
    throw invalidCalendar("calendar must begin with BEGIN:VCALENDAR");
  }

  let versionSeen = false;
  let productIdSeen = false;
  let calendarEnded = false;
  let current: FreeBusyBuilder | undefined;
  const availability: PersonAvailability[] = [];

  for (const line of lines.slice(1)) {
    if (calendarEnded) {
      throw invalidCalendar(
        `line ${line.lineNumber} appears after END:VCALENDAR`,
      );
    }

    if (current !== undefined) {
      if (line.name === "END" && line.value.toUpperCase() === "VFREEBUSY") {
        requireNoParameters(line);
        availability.push(finishFreeBusy(current, line.lineNumber));
        current = undefined;
      } else {
        parseFreeBusyLine(current, line);
      }

      continue;
    }

    if (line.name === "VERSION") {
      requireNoParameters(line);

      if (versionSeen) {
        throw invalidCalendar("VERSION must occur exactly once");
      }

      if (line.value !== "2.0") {
        throw invalidCalendar("only iCalendar VERSION:2.0 is supported");
      }

      versionSeen = true;
      continue;
    }

    if (line.name === "PRODID") {
      requireNoParameters(line);

      if (productIdSeen || line.value.trim().length === 0) {
        throw invalidCalendar("PRODID must occur exactly once and be non-empty");
      }

      productIdSeen = true;
      continue;
    }

    if (line.name === "BEGIN" && line.value.toUpperCase() === "VFREEBUSY") {
      requireNoParameters(line);
      current = { busyIntervals: [] };
      continue;
    }

    if (line.name === "END" && line.value.toUpperCase() === "VCALENDAR") {
      requireNoParameters(line);
      calendarEnded = true;
      continue;
    }

    throw invalidCalendar(
      `unsupported calendar content at line ${line.lineNumber}: ${line.name}`,
    );
  }

  if (current !== undefined) {
    throw invalidCalendar("VFREEBUSY component is not closed");
  }

  if (!calendarEnded) {
    throw invalidCalendar("calendar must end with END:VCALENDAR");
  }

  if (!versionSeen || !productIdSeen) {
    throw invalidCalendar("VCALENDAR requires VERSION:2.0 and PRODID");
  }

  if (availability.length === 0) {
    throw invalidCalendar("calendar must contain at least one VFREEBUSY component");
  }

  return Object.freeze(availability);
}

function parseFreeBusyLine(builder: FreeBusyBuilder, line: ContentLine): void {
  if (line.name === "BEGIN") {
    throw invalidCalendar(
      `nested component at line ${line.lineNumber} is not supported`,
    );
  }

  switch (line.name) {
    case "UID":
      requireNoParameters(line);
      builder.uid = assignSingleValue(
        builder.uid,
        line.value.trim(),
        "UID",
        line.lineNumber,
      );
      if (builder.uid.length === 0) {
        throw invalidCalendar(`UID at line ${line.lineNumber} must be non-empty`);
      }
      return;

    case "ORGANIZER":
      requireNoParameters(line);
      builder.organizer = assignSingleValue(
        builder.organizer,
        parseOrganizer(line.value, line.lineNumber),
        "ORGANIZER",
        line.lineNumber,
      );
      return;

    case "DTSTART":
      requireNoParameters(line);
      builder.start = assignSingleValue(
        builder.start,
        parseUtcDateTime(line.value, "DTSTART", line.lineNumber),
        "DTSTART",
        line.lineNumber,
      );
      return;

    case "DTEND":
      requireNoParameters(line);
      builder.end = assignSingleValue(
        builder.end,
        parseUtcDateTime(line.value, "DTEND", line.lineNumber),
        "DTEND",
        line.lineNumber,
      );
      return;

    case "DTSTAMP":
      requireNoParameters(line);
      builder.stamp = assignSingleValue(
        builder.stamp,
        parseUtcDateTime(line.value, "DTSTAMP", line.lineNumber),
        "DTSTAMP",
        line.lineNumber,
      );
      return;

    case "FREEBUSY":
      requireSupportedFreeBusyParameters(line);
      builder.busyIntervals.push(...parseFreeBusyPeriods(line));
      return;

    default:
      throw invalidCalendar(
        `unsupported VFREEBUSY property at line ${line.lineNumber}: ${line.name}`,
      );
  }
}

function finishFreeBusy(
  builder: FreeBusyBuilder,
  lineNumber: number,
): PersonAvailability {
  if (builder.uid === undefined || builder.stamp === undefined) {
    throw invalidCalendar(
      `VFREEBUSY ending at line ${lineNumber} requires UID and DTSTAMP`,
    );
  }

  if (
    builder.organizer === undefined ||
    builder.start === undefined ||
    builder.end === undefined
  ) {
    throw invalidCalendar(
      `VFREEBUSY ending at line ${lineNumber} requires ORGANIZER, DTSTART, and DTEND`,
    );
  }

  let coverage;

  try {
    coverage = createTimeRange(builder.start, builder.end);
  } catch (error) {
    throw invalidCalendar(
      `VFREEBUSY ending at line ${lineNumber} has invalid coverage: ${errorMessage(error)}`,
      error,
    );
  }

  for (const busyInterval of builder.busyIntervals) {
    if (
      busyInterval.start.getTime() < coverage.start.getTime() ||
      busyInterval.end.getTime() > coverage.end.getTime()
    ) {
      throw invalidCalendar(
        `VFREEBUSY ending at line ${lineNumber} contains a FREEBUSY period outside its coverage`,
      );
    }
  }

  return Object.freeze({
    personId: builder.organizer,
    coverage,
    busyIntervals: Object.freeze(builder.busyIntervals),
  });
}

function parseFreeBusyPeriods(line: ContentLine): readonly BusyInterval[] {
  if (line.value.length === 0) {
    throw invalidCalendar(`FREEBUSY at line ${line.lineNumber} must be non-empty`);
  }

  return line.value.split(",").map((period) => {
    const boundaries = period.split("/");

    if (boundaries.length !== 2) {
      throw invalidCalendar(
        `FREEBUSY at line ${line.lineNumber} must use a UTC start/end pair`,
      );
    }

    const [startValue, endValue] = boundaries;
    if (startValue === undefined || endValue === undefined) {
      throw invalidCalendar(
        `FREEBUSY at line ${line.lineNumber} must use a UTC start/end pair`,
      );
    }

    const start = parseUtcDateTime(startValue, "FREEBUSY start", line.lineNumber);
    const end = parseUtcDateTime(endValue, "FREEBUSY end", line.lineNumber);

    try {
      return createTimeRange(start, end);
    } catch (error) {
      throw invalidCalendar(
        `FREEBUSY at line ${line.lineNumber} has an invalid range: ${errorMessage(error)}`,
        error,
      );
    }
  });
}

function parseOrganizer(value: string, lineNumber: number): PersonId {
  const trimmed = value.trim();
  const withoutScheme = /^mailto:/i.test(trimmed) ? trimmed.slice(7) : trimmed;

  try {
    return normalizePersonId(withoutScheme);
  } catch {
    throw invalidCalendar(
      `ORGANIZER at line ${lineNumber} must contain an email address`,
    );
  }
}

function parseUtcDateTime(
  value: string,
  property: string,
  lineNumber: number,
): Date {
  const match = UTC_DATE_TIME_PATTERN.exec(value);

  if (match === null) {
    throw invalidCalendar(
      `${property} at line ${lineNumber} must use YYYYMMDDTHHMMSSZ UTC syntax`,
    );
  }

  const [, year, month, day, hour, minute, second] = match;
  const isoValue = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  const date = new Date(isoValue);

  if (
    !Number.isFinite(date.getTime()) ||
    formatUtcDateTime(date) !== value
  ) {
    throw invalidCalendar(
      `${property} at line ${lineNumber} must be a valid UTC date-time`,
    );
  }

  return date;
}

function formatUtcDateTime(value: Date): string {
  const year = value.getUTCFullYear().toString().padStart(4, "0");
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");
  const hour = value.getUTCHours().toString().padStart(2, "0");
  const minute = value.getUTCMinutes().toString().padStart(2, "0");
  const second = value.getUTCSeconds().toString().padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function parseContentLines(source: string): readonly ContentLine[] {
  const physicalLines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  while (physicalLines.at(-1) === "") {
    physicalLines.pop();
  }

  const unfolded: Array<{ value: string; lineNumber: number }> = [];

  for (const [index, physicalLine] of physicalLines.entries()) {
    const lineNumber = index + 1;

    if (physicalLine.startsWith(" ") || physicalLine.startsWith("\t")) {
      const previous = unfolded.at(-1);

      if (previous === undefined) {
        throw invalidCalendar(
          `folded content line at line ${lineNumber} has no preceding line`,
        );
      }

      unfolded[unfolded.length - 1] = {
        value: previous.value + physicalLine.slice(1),
        lineNumber: previous.lineNumber,
      };
      continue;
    }

    if (physicalLine.length === 0) {
      throw invalidCalendar(`blank content line at line ${lineNumber} is invalid`);
    }

    unfolded.push({ value: physicalLine, lineNumber });
  }

  return unfolded.map(({ value, lineNumber }) => {
    const separatorIndex = value.indexOf(":");

    if (separatorIndex <= 0) {
      throw invalidCalendar(`malformed content line at line ${lineNumber}`);
    }

    const property = value.slice(0, separatorIndex).split(";");
    const name = property[0];

    if (name === undefined || !/^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
      throw invalidCalendar(`invalid property name at line ${lineNumber}`);
    }

    return {
      name: name.toUpperCase(),
      parameters: property.slice(1),
      value: value.slice(separatorIndex + 1),
      lineNumber,
    };
  });
}

function requireNoParameters(line: ContentLine): void {
  if (line.parameters.length !== 0) {
    throw invalidCalendar(
      `${line.name} parameters at line ${line.lineNumber} are not supported`,
    );
  }
}

function requireSupportedFreeBusyParameters(line: ContentLine): void {
  if (
    line.parameters.length === 0 ||
    (line.parameters.length === 1 &&
      line.parameters[0]?.toUpperCase() === "FBTYPE=BUSY")
  ) {
    return;
  }

  throw invalidCalendar(
    `FREEBUSY parameters at line ${line.lineNumber} are not supported`,
  );
}

function assignSingleValue<T>(
  current: T | undefined,
  value: T,
  property: string,
  lineNumber: number,
): T {
  if (current !== undefined) {
    throw invalidCalendar(
      `${property} must occur once per VFREEBUSY (duplicate at line ${lineNumber})`,
    );
  }

  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function invalidCalendar(message: string, cause?: unknown): Error {
  return new Error(`Invalid free/busy calendar: ${message}`, { cause });
}
