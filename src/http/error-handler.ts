import type { ServerResponse } from "node:http";

import { AvailabilityCoverageError } from "../shared/application-errors.js";
import { RequestValidationError } from "./meeting-search.schema.js";

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
}

export class RouteNotFoundError extends Error {
  override readonly name = "RouteNotFoundError";
}

export class MethodNotAllowedError extends Error {
  override readonly name = "MethodNotAllowedError";
}

export function handleHttpError(
  error: unknown,
  response: ServerResponse,
): void {
  const problem = mapProblemDetails(error);
  const body = JSON.stringify(problem);
  const headers: Record<string, string | number> = {
    "content-type": "application/problem+json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  };

  if (error instanceof MethodNotAllowedError) {
    headers.allow = "GET";
  }

  response.writeHead(problem.status, headers);
  response.end(body);
}

function mapProblemDetails(error: unknown): ProblemDetails {
  if (error instanceof RequestValidationError) {
    return {
      type: "urn:meeting-scheduler:problem:invalid-request",
      title: "Bad Request",
      status: 400,
      detail: error.message,
    };
  }

  if (error instanceof RouteNotFoundError) {
    return {
      type: "urn:meeting-scheduler:problem:not-found",
      title: "Not Found",
      status: 404,
      detail: "The requested resource was not found.",
    };
  }

  if (error instanceof MethodNotAllowedError) {
    return {
      type: "urn:meeting-scheduler:problem:method-not-allowed",
      title: "Method Not Allowed",
      status: 405,
      detail: "The requested resource only supports GET.",
    };
  }

  if (error instanceof AvailabilityCoverageError) {
    return {
      type: "urn:meeting-scheduler:problem:availability-coverage",
      title: "Unprocessable Entity",
      status: 422,
      detail:
        "The requested time range is not fully covered by availability data.",
    };
  }

  return {
    type: "urn:meeting-scheduler:problem:internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred while processing the request.",
  };
}
