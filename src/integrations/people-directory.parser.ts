import type {
  Person,
  PersonId,
  Skill,
} from "../scheduling/model/person.js";
import { normalizePersonId } from "./person-identity.js";

export function parsePeopleDirectory(source: string): readonly Person[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw invalidPeopleDirectory("source is not valid JSON", error);
  }

  if (!Array.isArray(parsed)) {
    throw invalidPeopleDirectory("top-level value must be an array");
  }

  const people: Person[] = [];
  const personIds = new Set<PersonId>();

  for (const [index, value] of parsed.entries()) {
    const record = parsePersonRecord(value, index);

    if (personIds.has(record.personId)) {
      throw invalidPeopleDirectory(
        `record ${index} duplicates person identity "${record.personId}"`,
      );
    }

    personIds.add(record.personId);
    people.push(record);
  }

  return Object.freeze(people);
}

function parsePersonRecord(value: unknown, index: number): Person {
  if (!isRecord(value)) {
    throw invalidPeopleDirectory(`record ${index} must be an object`);
  }

  requireNonEmptyString(value.firstName, `record ${index}.firstName`);
  requireNonEmptyString(value.lastName, `record ${index}.lastName`);

  const email = requireNonEmptyString(value.email, `record ${index}.email`);
  let personId: PersonId;

  try {
    personId = normalizePersonId(email);
  } catch {
    throw invalidPeopleDirectory(
      `record ${index}.email must be a valid email address`,
    );
  }

  if (!Array.isArray(value.skills)) {
    throw invalidPeopleDirectory(`record ${index}.skills must be an array`);
  }

  const skills: Skill[] = [];
  const seenSkills = new Set<Skill>();

  for (const [skillIndex, skillValue] of value.skills.entries()) {
    const skill = requireNonEmptyString(
      skillValue,
      `record ${index}.skills[${skillIndex}]`,
    ).toLowerCase();

    if (seenSkills.has(skill)) {
      throw invalidPeopleDirectory(
        `record ${index}.skills contains duplicate skill "${skill}"`,
      );
    }

    seenSkills.add(skill);
    skills.push(skill);
  }

  return Object.freeze({
    personId,
    skills: Object.freeze(skills),
  });
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidPeopleDirectory(`${field} must be a non-empty string`);
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidPeopleDirectory(message: string, cause?: unknown): Error {
  return new Error(`Invalid people directory: ${message}`, { cause });
}
