import type { MeetingType } from "../scheduling/model/meeting.js";

const supportedParameters = new Set(["type", "start", "end"]);
const utcTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

export interface ValidatedMeetingSearchRequest {
  readonly type: MeetingType;
  readonly start: string;
  readonly end: string;
}

export class RequestValidationError extends Error {
  override readonly name = "RequestValidationError";
}

export function validateMeetingSearchRequest(
  parameters: URLSearchParams,
): ValidatedMeetingSearchRequest {
  for (const parameter of parameters.keys()) {
    if (!supportedParameters.has(parameter)) {
      throw new RequestValidationError(
        `Unexpected query parameter "${parameter}".`,
      );
    }
  }

  const type = requireSingleParameter(parameters, "type");
  const start = requireSingleParameter(parameters, "start");
  const end = requireSingleParameter(parameters, "end");

  if (!isMeetingType(type)) {
    throw new RequestValidationError(
      'Query parameter "type" must be "job-interview" or "sales".',
    );
  }

  const startTime = parseUtcTimestamp(start, "start");
  const endTime = parseUtcTimestamp(end, "end");

  if (startTime >= endTime) {
    throw new RequestValidationError(
      'Query parameter "start" must be before "end".',
    );
  }

  return { type, start, end };
}

function requireSingleParameter(
  parameters: URLSearchParams,
  name: string,
): string {
  const values = parameters.getAll(name);

  if (values.length !== 1 || values[0] === "") {
    throw new RequestValidationError(
      `Query parameter "${name}" must be provided exactly once.`,
    );
  }

  return values[0]!;
}

function isMeetingType(value: string): value is MeetingType {
  return value === "job-interview" || value === "sales";
}

function parseUtcTimestamp(value: string, name: string): number {
  const match = utcTimestampPattern.exec(value);

  if (match === null) {
    throw invalidTimestamp(name);
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw invalidTimestamp(name);
  }

  const parsed = new Date(timestamp);
  const expectedMilliseconds = Number((match[7] ?? "0").padEnd(3, "0"));
  const componentsMatch =
    parsed.getUTCFullYear() === Number(match[1]) &&
    parsed.getUTCMonth() + 1 === Number(match[2]) &&
    parsed.getUTCDate() === Number(match[3]) &&
    parsed.getUTCHours() === Number(match[4]) &&
    parsed.getUTCMinutes() === Number(match[5]) &&
    parsed.getUTCSeconds() === Number(match[6]) &&
    parsed.getUTCMilliseconds() === expectedMilliseconds;

  if (!componentsMatch) {
    throw invalidTimestamp(name);
  }

  return timestamp;
}

function invalidTimestamp(name: string): RequestValidationError {
  return new RequestValidationError(
    `Query parameter "${name}" must be a valid UTC timestamp ending in "Z".`,
  );
}
