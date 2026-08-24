import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { loadReferenceData } from "../../src/integrations/reference-data-loader.js";

test("loads, resolves, groups, and sorts canonical reference data", async () => {
  const people = [
    personRecord("Alice@Example.com", ["sales"]),
    personRecord("bob@example.com", ["recruitment"]),
  ];
  const calendarSource = calendar([
    freeBusyComponent({
      uid: "alice-february",
      organizer: "alice@example.com",
      start: "20260201T000000Z",
      end: "20260301T000000Z",
    }),
    freeBusyComponent({
      uid: "alice-january",
      organizer: "ALICE@EXAMPLE.COM",
      freeBusy: [
        "FREEBUSY:20260110T100000Z/20260110T110000Z",
        "FREEBUSY:20260105T100000Z/20260105T110000Z",
      ],
    }),
  ]);

  await withReferenceFiles(JSON.stringify(people), calendarSource, async (paths) => {
    const referenceData = await loadReferenceData(paths);
    const aliceAvailability = referenceData.availabilityByPersonId.get(
      "alice@example.com",
    );

    assert.deepEqual(referenceData.peopleById.get("alice@example.com"), {
      personId: "alice@example.com",
      skills: ["sales"],
    });
    assert.equal(referenceData.peopleById.size, 2);
    assert.equal(aliceAvailability?.length, 2);
    assert.equal(
      aliceAvailability[0]?.coverage.start.toISOString(),
      "2026-01-01T00:00:00.000Z",
    );
    assert.deepEqual(
      aliceAvailability[0]?.busyIntervals.map(({ start }) =>
        start.toISOString(),
      ),
      ["2026-01-05T10:00:00.000Z", "2026-01-10T10:00:00.000Z"],
    );
    assert.deepEqual(
      referenceData.availabilityByPersonId.get("bob@example.com"),
      [],
      "a person without published coverage remains unknown, represented by no partitions",
    );
    assert.equal(Object.isFrozen(aliceAvailability), true);
  });
});

test("fails loading when a calendar identity is absent from the directory", async () => {
  await withReferenceFiles(
    JSON.stringify([personRecord("alice@example.com", [])]),
    calendar([
      freeBusyComponent({ organizer: "unknown@example.com" }),
    ]),
    async (paths) => {
      await assert.rejects(
        loadReferenceData(paths),
        /calendar identity "unknown@example.com" does not exist in the people directory/,
      );
    },
  );
});

test("fails loading when either source is invalid", async () => {
  await withReferenceFiles("not JSON", calendar([freeBusyComponent()]), async (paths) => {
    await assert.rejects(loadReferenceData(paths), /Invalid people directory/);
  });
});

test("loads the supplied datasets without starting an HTTP server", async () => {
  const referenceData = await loadReferenceData({
    peopleDirectoryPath: resolve("data/people-directory.json"),
    freeBusyCalendarPath: resolve("data/free-busy-data.ics"),
  });

  assert.equal(referenceData.peopleById.size, 20);
  assert.equal(referenceData.availabilityByPersonId.size, 20);

  const partitions = [...referenceData.availabilityByPersonId.values()].flat();
  assert.equal(partitions.length, 480);
  assert.equal(
    partitions.every(
      ({ coverage, busyIntervals }) =>
        busyIntervals.every(
          ({ start, end }) =>
            start.getTime() >= coverage.start.getTime() &&
            end.getTime() <= coverage.end.getTime(),
        ),
    ),
    true,
  );
});

interface ReferenceDataPaths {
  readonly peopleDirectoryPath: string;
  readonly freeBusyCalendarPath: string;
}

interface FreeBusyOptions {
  readonly uid?: string;
  readonly organizer?: string;
  readonly start?: string;
  readonly end?: string;
  readonly freeBusy?: readonly string[];
}

async function withReferenceFiles(
  peopleSource: string,
  calendarSource: string,
  run: (paths: ReferenceDataPaths) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "meeting-scheduler-reference-"));
  const paths = {
    peopleDirectoryPath: join(directory, "people.json"),
    freeBusyCalendarPath: join(directory, "availability.ics"),
  };

  try {
    await Promise.all([
      writeFile(paths.peopleDirectoryPath, peopleSource, "utf8"),
      writeFile(paths.freeBusyCalendarPath, calendarSource, "utf8"),
    ]);
    await run(paths);
  } finally {
    await rm(directory, { recursive: true });
  }
}

function personRecord(email: string, skills: readonly string[]): object {
  return {
    firstName: "Test",
    lastName: "Person",
    email,
    skills,
  };
}

function calendar(components: readonly string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meeting Scheduler Tests//EN",
    ...components,
    "END:VCALENDAR",
  ].join("\n");
}

function freeBusyComponent(options: FreeBusyOptions = {}): string {
  return [
    "BEGIN:VFREEBUSY",
    `UID:${options.uid ?? "availability-1"}`,
    `ORGANIZER:${options.organizer ?? "alice@example.com"}`,
    `DTSTART:${options.start ?? "20260101T000000Z"}`,
    `DTEND:${options.end ?? "20260201T000000Z"}`,
    "DTSTAMP:20251201T000000Z",
    ...(options.freeBusy ?? []),
    "END:VFREEBUSY",
  ].join("\n");
}
