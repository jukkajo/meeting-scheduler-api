import type { MeetingType } from "./meeting.js";
import type { Skill } from "./person.js";

export interface MeetingRule {
  readonly participantCount: number;
  readonly requiredSkills: readonly Skill[];
}

export const meetingRules = {
  "job-interview": {
    participantCount: 2,
    requiredSkills: ["recruitment"],
  },
  sales: {
    participantCount: 3,
    requiredSkills: ["sales", "software-architecture"],
  },
} as const satisfies Readonly<Record<MeetingType, MeetingRule>>;
