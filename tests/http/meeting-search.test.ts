import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createMeetingSearchHandler,
  type MeetingSearchHandlerDependencies,
} from "../../src/http/meeting-search.handler.js";
import type { ProblemDetails } from "../../src/http/error-handler.js";
import { createRoutes } from "../../src/http/routes.js";
import { findSuitableTimes } from "../../src/scheduling/find-suitable-times.js";
import type { Person, PersonId } from "../../src/scheduling/model/person.js";
import type { PersonAvailability } from "../../src/scheduling/model/time.js";

test("returns a non-empty job-interview search response", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-01T09:00:00Z",
      end: "2024-01-01T10:00:00Z",
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
    assert.deepEqual(await response.json(), {
      slots: [
        {
          start: "2024-01-01T09:00:00.000Z",
          end: "2024-01-01T10:00:00.000Z",
          participants: ["alice@example.com", "bob@example.com"],
        },
      ],
    });
  });
});

test("returns a valid sales search response", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "sales",
      start: "2024-01-01T09:00:00.125Z",
      end: "2024-01-01T10:00:00.125Z",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      slots: [
        {
          start: "2024-01-01T09:00:00.125Z",
          end: "2024-01-01T10:00:00.125Z",
          participants: [
            "alice@example.com",
            "bob@example.com",
            "carol@example.com",
          ],
        },
      ],
    });
  });
});

test("returns an empty successful response when no participant set qualifies", async () => {
  const alice = person("alice@example.com", ["recruitment"]);
  const dependencies = referenceDependencies(
    [alice],
    [availableForDay(alice.personId)],
  );

  await withTestServer(dependencies, async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-01T09:00:00Z",
      end: "2024-01-01T10:00:00Z",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { slots: [] });
  });
});

test("rejects an invalid meeting type", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "planning",
      start: "2024-01-01T09:00:00Z",
      end: "2024-01-01T10:00:00Z",
    });

    await assertProblem(response, {
      type: "urn:meeting-scheduler:problem:invalid-request",
      title: "Bad Request",
      status: 400,
      detail: 'Query parameter "type" must be "job-interview" or "sales".',
    });
  });
});

test("rejects an incomplete request shape", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-01T09:00:00Z",
    });

    await assertProblem(response, {
      type: "urn:meeting-scheduler:problem:invalid-request",
      title: "Bad Request",
      status: 400,
      detail: 'Query parameter "end" must be provided exactly once.',
    });
  });
});

test("rejects a malformed timestamp", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-02-30T09:00:00Z",
      end: "2024-03-01T10:00:00Z",
    });

    await assertProblem(response, {
      type: "urn:meeting-scheduler:problem:invalid-request",
      title: "Bad Request",
      status: 400,
      detail:
        'Query parameter "start" must be a valid UTC timestamp ending in "Z".',
    });
  });
});

test("rejects a timestamp with a non-UTC offset", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-01T11:00:00+02:00",
      end: "2024-01-01T12:00:00+02:00",
    });

    await assertProblem(response, {
      type: "urn:meeting-scheduler:problem:invalid-request",
      title: "Bad Request",
      status: 400,
      detail:
        'Query parameter "start" must be a valid UTC timestamp ending in "Z".',
    });
  });
});

test("rejects search bounds whose start is not before the end", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-01T10:00:00Z",
      end: "2024-01-01T10:00:00Z",
    });

    await assertProblem(response, {
      type: "urn:meeting-scheduler:problem:invalid-request",
      title: "Bad Request",
      status: 400,
      detail: 'Query parameter "start" must be before "end".',
    });
  });
});

test("maps a known availability coverage failure to 422", async () => {
  await withTestServer(referenceDependencies(), async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-02T09:00:00Z",
      end: "2024-01-02T10:00:00Z",
    });

    await assertProblem(response, {
      type: "urn:meeting-scheduler:problem:availability-coverage",
      title: "Unprocessable Entity",
      status: 422,
      detail:
        "The requested time range is not fully covered by availability data.",
    });
  });
});

test("maps an unexpected failure to a non-leaking 500 response", async () => {
  const privateMessage = "secret integration failure";
  const dependencies: MeetingSearchHandlerDependencies = {
    ...referenceDependencies(),
    findSuitableTimes: () => {
      throw new Error(privateMessage);
    },
  };

  await withTestServer(dependencies, async (baseUrl) => {
    const response = await search(baseUrl, {
      type: "job-interview",
      start: "2024-01-01T09:00:00Z",
      end: "2024-01-01T10:00:00Z",
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^application\/problem\+json/,
    );
    assert.deepEqual(body, {
      type: "urn:meeting-scheduler:problem:internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred while processing the request.",
    });
    assert.equal(JSON.stringify(body).includes(privateMessage), false);
    assert.equal(JSON.stringify(body).includes("stack"), false);
  });
});

function referenceDependencies(
  people: readonly Person[] = [
    person("alice@example.com", ["recruitment"]),
    person("bob@example.com", ["sales"]),
    person("carol@example.com", ["software-architecture"]),
  ],
  availability: readonly PersonAvailability[] = people.map(({ personId }) =>
    availableForDay(personId),
  ),
): MeetingSearchHandlerDependencies {
  return {
    peopleById: new Map(people.map((value) => [value.personId, value])),
    availabilityByPersonId: new Map(
      availability.map((value) => [value.personId, [value]]),
    ),
    findSuitableTimes,
  };
}

function person(personId: PersonId, skills: readonly string[]): Person {
  return { personId, skills };
}

function availableForDay(personId: PersonId): PersonAvailability {
  return {
    personId,
    coverage: {
      start: new Date("2024-01-01T00:00:00Z"),
      end: new Date("2024-01-02T00:00:00Z"),
    },
    busyIntervals: [],
  };
}

async function withTestServer(
  dependencies: MeetingSearchHandlerDependencies,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(
    createRoutes(createMeetingSearchHandler(dependencies)),
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)));
    });
  }
}

function search(
  baseUrl: string,
  parameters: Readonly<Record<string, string>>,
): Promise<Response> {
  const url = new URL("/meeting-slots", baseUrl);

  for (const [name, value] of Object.entries(parameters)) {
    url.searchParams.set(name, value);
  }

  return fetch(url);
}

async function assertProblem(
  response: Response,
  expected: ProblemDetails,
): Promise<void> {
  assert.equal(response.status, expected.status);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/problem\+json/,
  );
  assert.deepEqual(await response.json(), expected);
}
