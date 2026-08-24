import { createServer } from "node:http";
import { resolve } from "node:path";

import { createMeetingSearchHandler } from "./http/meeting-search.handler.js";
import { createRoutes } from "./http/routes.js";
import { loadReferenceData } from "./integrations/reference-data-loader.js";
import { findSuitableTimes } from "./scheduling/find-suitable-times.js";

const port = 8080;
const referenceData = await loadReferenceData({
  peopleDirectoryPath: resolve("data/people-directory.json"),
  freeBusyCalendarPath: resolve("data/free-busy-data.ics"),
});
const meetingSearchHandler = createMeetingSearchHandler({
  ...referenceData,
  findSuitableTimes,
});
const server = createServer(createRoutes(meetingSearchHandler));

server.listen(port, () => {
  console.log(`Meeting Scheduler API listening on http://localhost:${port}`);
});
