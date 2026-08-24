import type { PersonId } from "../scheduling/model/person.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePersonId(value: string): PersonId {
  const personId = value.toLowerCase();

  if (!EMAIL_PATTERN.test(personId)) {
    throw new RangeError("Person identity must be a valid email address");
  }

  return personId;
}
