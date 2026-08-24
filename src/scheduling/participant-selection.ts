import type { MeetingRule } from "./model/meeting-rules.js";
import type { Person, PersonId } from "./model/person.js";

/** Selects the first rule-satisfying combination in PersonId order. */
export function selectParticipants(
  availablePeople: readonly Person[],
  meetingRule: MeetingRule,
): readonly PersonId[] | undefined {
  const orderedPeople = [...availablePeople].sort((left, right) =>
    comparePersonIds(left.personId, right.personId),
  );

  return selectCombination(orderedPeople, meetingRule, 0, []);
}

function selectCombination(
  people: readonly Person[],
  meetingRule: MeetingRule,
  nextIndex: number,
  selectedPeople: readonly Person[],
): readonly PersonId[] | undefined {
  if (selectedPeople.length === meetingRule.participantCount) {
    return satisfiesRequiredSkills(selectedPeople, meetingRule)
      ? selectedPeople.map(({ personId }) => personId)
      : undefined;
  }

  const peopleStillNeeded = meetingRule.participantCount - selectedPeople.length;

  for (
    let index = nextIndex;
    index <= people.length - peopleStillNeeded;
    index += 1
  ) {
    const person = people[index];

    if (person === undefined) {
      continue;
    }

    const selection = selectCombination(
      people,
      meetingRule,
      index + 1,
      [...selectedPeople, person],
    );

    if (selection !== undefined) {
      return selection;
    }
  }

  return undefined;
}

function satisfiesRequiredSkills(
  selectedPeople: readonly Person[],
  meetingRule: MeetingRule,
): boolean {
  return meetingRule.requiredSkills.every((requiredSkill) =>
    selectedPeople.some(({ skills }) => skills.includes(requiredSkill)),
  );
}

function comparePersonIds(left: PersonId, right: PersonId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
