import assert from "node:assert/strict";
import test from "node:test";

import { parseFreeBusyCalendar } from "../../src/integrations/free-busy-calendar.parser.js";

test("converts the supported VFREEBUSY subset into canonical availability", () => {
  const availability = parseFreeBusyCalendar(
    calendar([
      freeBusyComponent({
        organizer: "MAILTO:Alice.Example@Example.COM",
        freeBusy: [
          "FREEBUSY:20260101T120000Z/20260101T123000Z",
          "FREEBUSY;FBTYPE=BUSY:20260101T090000Z/20260101T100000Z,20260101T103000Z/20260101T110000Z",
        ],
      }),
    ]),
  );

  assert.deepEqual(availability, [
    {
      personId: "alice.example@example.com",
      coverage: {
        start: new Date("2026-01-01T00:00:00.000Z"),
        end: new Date("2026-02-01T00:00:00.000Z"),
      },
      busyIntervals: [
        {
          start: new Date("2026-01-01T12:00:00.000Z"),
          end: new Date("2026-01-01T12:30:00.000Z"),
        },
        {
          start: new Date("2026-01-01T09:00:00.000Z"),
          end: new Date("2026-01-01T10:00:00.000Z"),
        },
        {
          start: new Date("2026-01-01T10:30:00.000Z"),
          end: new Date("2026-01-01T11:00:00.000Z"),
        },
      ],
    },
  ]);
});

test("preserves separate coverage partitions for the same person", () => {
  const availability = parseFreeBusyCalendar(
    calendar([
      freeBusyComponent({
        uid: "january",
        organizer: "alice@example.com",
      }),
      freeBusyComponent({
        uid: "february",
        organizer: "alice@example.com",
        start: "20260201T000000Z",
        end: "20260301T000000Z",
      }),
    ]),
  );

  assert.equal(availability.length, 2);
  assert.equal(availability[0]?.personId, "alice@example.com");
  assert.equal(availability[1]?.personId, "alice@example.com");
  assert.deepEqual(availability[0]?.busyIntervals, []);
  assert.deepEqual(availability[1]?.busyIntervals, []);
  assert.equal(
    availability[0]?.coverage.end.toISOString(),
    "2026-02-01T00:00:00.000Z",
  );
  assert.equal(
    availability[1]?.coverage.start.toISOString(),
    "2026-02-01T00:00:00.000Z",
  );
});

test("accepts RFC content-line folding", () => {
  const source = calendar([
    freeBusyComponent({
      organizer: "alice@example.\n com",
    }),
  ]);

  assert.equal(
    parseFreeBusyCalendar(source)[0]?.personId,
    "alice@example.com",
  );
});

for (const [description, source, expectedMessage] of [
  [
    "a calendar without the required outer structure",
    "VERSION:2.0\nEND:VCALENDAR",
    /must begin with BEGIN:VCALENDAR/,
  ],
  [
    "a component with a missing organizer",
    calendar([freeBusyComponent({ organizer: undefined })]),
    /requires ORGANIZER, DTSTART, and DTEND/,
  ],
  [
    "a non-UTC date-time",
    calendar([freeBusyComponent({ start: "20260101T000000" })]),
    /must use YYYYMMDDTHHMMSSZ UTC syntax/,
  ],
  [
    "an impossible calendar date",
    calendar([freeBusyComponent({ start: "20260230T000000Z" })]),
    /must be a valid UTC date-time/,
  ],
  [
    "an inverted coverage range",
    calendar([
      freeBusyComponent({
        start: "20260201T000000Z",
        end: "20260101T000000Z",
      }),
    ]),
    /has invalid coverage/,
  ],
  [
    "a busy interval outside authoritative coverage",
    calendar([
      freeBusyComponent({
        freeBusy: ["FREEBUSY:20251231T230000Z/20260101T003000Z"],
      }),
    ]),
    /outside its coverage/,
  ],
  [
    "an unsupported component",
    calendar(["BEGIN:VEVENT\nEND:VEVENT"]),
    /unsupported calendar content.*BEGIN/,
  ],
  [
    "an unsupported free/busy type",
    calendar([
      freeBusyComponent({
        freeBusy: [
          "FREEBUSY;FBTYPE=FREE:20260101T090000Z/20260101T100000Z",
        ],
      }),
    ]),
    /FREEBUSY parameters.*not supported/,
  ],
] as const) {
  test(`rejects ${description}`, () => {
    assert.throws(() => parseFreeBusyCalendar(source), expectedMessage);
  });
}

interface FreeBusyOptions {
  readonly uid?: string;
  readonly organizer?: string;
  readonly start?: string;
  readonly end?: string;
  readonly freeBusy?: readonly string[];
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
  const organizer =
    "organizer" in options ? options.organizer : "alice@example.com";

  return [
    "BEGIN:VFREEBUSY",
    `UID:${options.uid ?? "availability-1"}`,
    ...(organizer === undefined ? [] : [`ORGANIZER:${organizer}`]),
    `DTSTART:${options.start ?? "20260101T000000Z"}`,
    `DTEND:${options.end ?? "20260201T000000Z"}`,
    "DTSTAMP:20251201T000000Z",
    ...(options.freeBusy ?? []),
    "END:VFREEBUSY",
  ].join("\n");
}
