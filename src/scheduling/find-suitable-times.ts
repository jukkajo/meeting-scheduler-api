import {
  deriveCandidateIntervals,
  findAvailablePeople,
  findRelevantAvailabilityBoundaries,
  verifyAuthoritativeCoverage,
  type AvailabilityByPersonId,
} from "./availability-calculation.js";
import type { MeetingRule } from "./model/meeting-rules.js";
import type { SuitableInterval } from "./model/meeting.js";
import type { Person, PersonId } from "./model/person.js";
import type { TimeRange } from "./model/time.js";
import { selectParticipants } from "./participant-selection.js";

export function findSuitableTimes(
  requestedRange: TimeRange,
  meetingRule: MeetingRule,
  peopleById: ReadonlyMap<PersonId, Person>,
  availabilityByPersonId: AvailabilityByPersonId,
): SuitableInterval[] {
  verifyAuthoritativeCoverage(requestedRange, availabilityByPersonId);

  const boundaries = findRelevantAvailabilityBoundaries(
    requestedRange,
    availabilityByPersonId,
  );
  const candidateIntervals = deriveCandidateIntervals(boundaries);
  const suitableIntervals: SuitableInterval[] = [];
  let activeParticipantIds: readonly PersonId[] | undefined;

  for (const candidateInterval of candidateIntervals) {
    const availablePeople = findAvailablePeople(
      candidateInterval,
      peopleById,
      availabilityByPersonId,
    );
    let selectedParticipantIds: readonly PersonId[] | undefined;
    const currentParticipantIds = activeParticipantIds;

    if (currentParticipantIds !== undefined) {
      const availableActivePeople = availablePeople.filter(({ personId }) =>
        currentParticipantIds.includes(personId),
      );
      selectedParticipantIds = selectParticipants(
        availableActivePeople,
        meetingRule,
      );
    }

    selectedParticipantIds ??= selectParticipants(availablePeople, meetingRule);

    if (selectedParticipantIds === undefined) {
      activeParticipantIds = undefined;
      continue;
    }

    const previousInterval = suitableIntervals.at(-1);

    if (
      previousInterval !== undefined &&
      previousInterval.end.getTime() === candidateInterval.start.getTime() &&
      participantSetsAreEqual(
        previousInterval.selectedParticipantIds,
        selectedParticipantIds,
      )
    ) {
      suitableIntervals[suitableIntervals.length - 1] = {
        start: previousInterval.start,
        end: candidateInterval.end,
        selectedParticipantIds: previousInterval.selectedParticipantIds,
      };
      activeParticipantIds = selectedParticipantIds;
      continue;
    }

    suitableIntervals.push({
      ...candidateInterval,
      selectedParticipantIds,
    });
    activeParticipantIds = selectedParticipantIds;
  }

  return suitableIntervals;
}

function participantSetsAreEqual(
  left: readonly PersonId[],
  right: readonly PersonId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((personId, index) => personId === right[index])
  );
}
