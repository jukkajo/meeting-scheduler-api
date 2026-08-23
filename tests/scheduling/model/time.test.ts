import assert from "node:assert/strict";
import test from "node:test";

import { createTimeRange } from "../../../src/scheduling/model/time.js";

test("creates a half-open time range when start is before end", () => {
  const start = new Date("2026-01-01T09:00:00.000Z");
  const end = new Date("2026-01-01T10:00:00.000Z");

  assert.deepEqual(createTimeRange(start, end), { start, end });
});

test("rejects a time range with equal boundaries", () => {
  const boundary = new Date("2026-01-01T09:00:00.000Z");

  assert.throws(
    () => createTimeRange(boundary, boundary),
    /start must be before end/,
  );
});

test("rejects a time range whose start is after its end", () => {
  assert.throws(
    () =>
      createTimeRange(
        new Date("2026-01-01T10:00:00.000Z"),
        new Date("2026-01-01T09:00:00.000Z"),
      ),
    /start must be before end/,
  );
});

test("rejects invalid date boundaries", () => {
  assert.throws(
    () => createTimeRange(new Date(Number.NaN), new Date()),
    /boundaries must be valid dates/,
  );
});
