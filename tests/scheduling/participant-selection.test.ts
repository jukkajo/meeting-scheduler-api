import assert from "node:assert/strict";
import test from "node:test";

import { meetingRules } from "../../src/scheduling/model/meeting-rules.js";
import type { Person } from "../../src/scheduling/model/person.js";
import { selectParticipants } from "../../src/scheduling/participant-selection.js";

test("selects exactly two people for an interview with recruitment represented", () => {
  const selection = selectParticipants(
    [
      person("charlie@example.com", ["recruitment"]),
      person("alice@example.com", []),
      person("bob@example.com", ["recruitment"]),
    ],
    meetingRules["job-interview"],
  );

  assert.deepEqual(selection, ["alice@example.com", "bob@example.com"]);
});

test("uses deterministic PersonId order and skips earlier invalid combinations", () => {
  const selection = selectParticipants(
    [
      person("charlie@example.com", ["recruitment"]),
      person("bob@example.com", []),
      person("alice@example.com", []),
    ],
    meetingRules["job-interview"],
  );

  assert.deepEqual(selection, ["alice@example.com", "charlie@example.com"]);
});

test("selects exactly three people satisfying both sales meeting skills", () => {
  const selection = selectParticipants(
    [
      person("dan@example.com", ["sales", "software-architecture"]),
      person("charlie@example.com", []),
      person("bob@example.com", ["software-architecture"]),
      person("alice@example.com", ["sales"]),
    ],
    meetingRules.sales,
  );

  assert.deepEqual(selection, [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
  ]);
});

test("allows one person to satisfy multiple required skills", () => {
  const selection = selectParticipants(
    [
      person("alice@example.com", ["sales", "software-architecture"]),
      person("bob@example.com", []),
      person("charlie@example.com", []),
    ],
    meetingRules.sales,
  );

  assert.deepEqual(selection, [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
  ]);
});

test("returns no selection when sales or software architecture is absent", () => {
  assert.equal(
    selectParticipants(
      [
        person("alice@example.com", ["software-architecture"]),
        person("bob@example.com", []),
        person("charlie@example.com", []),
      ],
      meetingRules.sales,
    ),
    undefined,
  );
  assert.equal(
    selectParticipants(
      [
        person("alice@example.com", ["sales"]),
        person("bob@example.com", []),
        person("charlie@example.com", []),
      ],
      meetingRules.sales,
    ),
    undefined,
  );
});

test("returns no selection when the exact participant count is unavailable", () => {
  assert.equal(
    selectParticipants(
      [person("alice@example.com", ["recruitment"])],
      meetingRules["job-interview"],
    ),
    undefined,
  );
});

function person(personId: string, skills: readonly string[]): Person {
  return { personId, skills };
}
