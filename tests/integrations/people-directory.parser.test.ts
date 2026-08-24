import assert from "node:assert/strict";
import test from "node:test";

import { parsePeopleDirectory } from "../../src/integrations/people-directory.parser.js";

test("converts people source records into normalized canonical people", () => {
  const people = parsePeopleDirectory(
    JSON.stringify([
      {
        firstName: " Alice ",
        lastName: " Example ",
        email: " Alice.Example@Example.COM ",
        skills: [" Recruitment ", "SOFTWARE-ARCHITECTURE"],
      },
    ]),
  );

  assert.deepEqual(people, [
    {
      personId: "alice.example@example.com",
      skills: ["recruitment", "software-architecture"],
    },
  ]);
  assert.equal("firstName" in people[0]!, false);
  assert.equal("email" in people[0]!, false);
});

test("rejects malformed JSON and a non-array top-level value", () => {
  assert.throws(
    () => parsePeopleDirectory("{"),
    /Invalid people directory: source is not valid JSON/,
  );
  assert.throws(
    () => parsePeopleDirectory(JSON.stringify({ people: [] })),
    /top-level value must be an array/,
  );
});

for (const [description, record, expectedMessage] of [
  [
    "missing required names",
    { lastName: "Example", email: "alice@example.com", skills: [] },
    /firstName must be a non-empty string/,
  ],
  [
    "an invalid email",
    {
      firstName: "Alice",
      lastName: "Example",
      email: "not-an-email",
      skills: [],
    },
    /email must be a valid email address/,
  ],
  [
    "a non-array skills value",
    {
      firstName: "Alice",
      lastName: "Example",
      email: "alice@example.com",
      skills: "recruitment",
    },
    /skills must be an array/,
  ],
  [
    "an empty skill",
    {
      firstName: "Alice",
      lastName: "Example",
      email: "alice@example.com",
      skills: [""],
    },
    /skills\[0\] must be a non-empty string/,
  ],
] as const) {
  test(`rejects ${description}`, () => {
    assert.throws(
      () => parsePeopleDirectory(JSON.stringify([record])),
      expectedMessage,
    );
  });
}

test("rejects identities and skills duplicated after normalization", () => {
  assert.throws(
    () =>
      parsePeopleDirectory(
        JSON.stringify([
          personRecord("Alice@Example.com", ["sales"]),
          personRecord("alice@example.COM", ["recruitment"]),
        ]),
      ),
    /duplicates person identity "alice@example.com"/,
  );

  assert.throws(
    () =>
      parsePeopleDirectory(
        JSON.stringify([personRecord("alice@example.com", ["sales", " SALES "])]),
      ),
    /duplicate skill "sales"/,
  );
});

function personRecord(email: string, skills: readonly string[]): object {
  return {
    firstName: "Alice",
    lastName: "Example",
    email,
    skills,
  };
}
