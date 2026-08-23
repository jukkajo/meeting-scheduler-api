import assert from "node:assert/strict";
import test from "node:test";

import { meetingRules } from "../../../src/scheduling/model/meeting-rules.js";

test("configures the mandatory job interview rule", () => {
  assert.equal(meetingRules["job-interview"].participantCount, 2);
  assert.deepEqual(meetingRules["job-interview"].requiredSkills, ["recruitment"]);
});

test("configures the mandatory sales meeting rule", () => {
  assert.equal(meetingRules.sales.participantCount, 3);
  assert.deepEqual(meetingRules.sales.requiredSkills, [
    "sales",
    "software-architecture",
  ]);
});
