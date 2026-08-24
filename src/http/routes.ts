import type { RequestListener, ServerResponse } from "node:http";

import {
  handleHttpError,
  MethodNotAllowedError,
  RouteNotFoundError,
} from "./error-handler.js";
import type { MeetingSearchHandler } from "./meeting-search.handler.js";
import { validateMeetingSearchRequest } from "./meeting-search.schema.js";

export function createRoutes(
  meetingSearchHandler: MeetingSearchHandler,
): RequestListener {
  return (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (url.pathname !== "/meeting-slots") {
        throw new RouteNotFoundError();
      }

      if (request.method !== "GET") {
        throw new MethodNotAllowedError();
      }

      const input = validateMeetingSearchRequest(url.searchParams);
      sendJson(response, 200, meetingSearchHandler(input));
    } catch (error) {
      handleHttpError(error, response);
    }
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  const body = JSON.stringify(value);

  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}
