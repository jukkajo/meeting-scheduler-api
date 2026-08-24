import { findSuitableTimes } from "../scheduling/find-suitable-times.js";
import { meetingRules } from "../scheduling/model/meeting-rules.js";
import type { Person, PersonId } from "../scheduling/model/person.js";
import { createTimeRange } from "../scheduling/model/time.js";
import type { AvailabilityByPersonId } from "../scheduling/availability-calculation.js";
import type { ValidatedMeetingSearchRequest } from "./meeting-search.schema.js";

export interface MeetingSlotResponse {
  readonly start: string;
  readonly end: string;
  readonly participants: readonly string[];
}

export interface MeetingSearchResponse {
  readonly slots: readonly MeetingSlotResponse[];
}

export interface MeetingSearchHandlerDependencies {
  readonly peopleById: ReadonlyMap<PersonId, Person>;
  readonly availabilityByPersonId: AvailabilityByPersonId;
  readonly findSuitableTimes: typeof findSuitableTimes;
}

export type MeetingSearchHandler = (
  request: ValidatedMeetingSearchRequest,
) => MeetingSearchResponse;

export function createMeetingSearchHandler(
  dependencies: MeetingSearchHandlerDependencies,
): MeetingSearchHandler {
  return (request) => {
    const requestedRange = createTimeRange(
      new Date(request.start),
      new Date(request.end),
    );
    const suitableIntervals = dependencies.findSuitableTimes(
      requestedRange,
      meetingRules[request.type],
      dependencies.peopleById,
      dependencies.availabilityByPersonId,
    );

    return {
      slots: suitableIntervals.map(
        ({ start, end, selectedParticipantIds }) => ({
          start: start.toISOString(),
          end: end.toISOString(),
          participants: selectedParticipantIds,
        }),
      ),
    };
  };
}
