import type { PersonId } from "./person.js";
import type { TimeRange } from "./time.js";

export type MeetingType = "job-interview" | "sales";

export interface SuitableInterval extends TimeRange {
  readonly selectedParticipantIds: readonly PersonId[];
}
