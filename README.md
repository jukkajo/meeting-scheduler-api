# Meeting Scheduler API

## Purpose

This project aims to implement a REST API to find suitable meeting times based on provided meeting type, requested time window, participant availability, and required skills.

The project is based on a take-home programming assignment. The task is to design a maintainable service with clear architecture, API documentation, testability, and containerized deployment. Main design goals are maintainability and security.

The original assignment description is available in [docs/anonymized-assignment.md](docs/anonymized-assignment.md).

## Data

The project uses the input datasets provided as part of the assignment:

* `data/free-busy-data.ics` — calendar busy times in iCalendar format
* `data/people-directory.json` — people information and related skills

## Documentation

Project documentation is maintained under `docs/`.

Current documentation:

* [Assignment](docs/anonymized-assignment.md) — original requirements and constraints for the project.
* [Contribution guidelines](CONTRIBUTING.md) — development workflow and repository stantard conventions.
* [OpenAPI contract](docs/openapi.yaml) — request, success-response, and error schemas.
* [Architecture decisions](docs/adr/) — major architectural decisions and their reasoning.
* [Design documentation](docs/design/) — detailed architecture and design documentation.

## API

`GET /meeting-slots` accepts three required query parameters:

| Parameter | Contract |
|---|---|
| `type` | `job-interview` or `sales` |
| `start` | Inclusive UTC timestamp ending in `Z` |
| `end` | Exclusive UTC timestamp ending in `Z`, later than `start` |

A successful request returns continuous suitable intervals and deterministic participant IDs. No matching interval is a successful empty response.

```json
{
  "slots": [
    {
      "start": "2024-01-02T09:00:00.000Z",
      "end": "2024-01-02T10:00:00.000Z",
      "participants": ["abby.bond@example.com", "amelie.bryan@example.com"]
    }
  ]
}
```

Validation failures return `400`, a request outside authoritative availability coverage returns `422`, and unexpected request-time failures return a non-leaking `500`. Error responses use `application/problem+json`.

## Prerequisites

The Docker workflow is the primary assignment path. It requires:

* Docker with a running Docker daemon
* Bash
* curl

Local development and validation additionally require:

* Node.js 20.19 or later
* npm

No database or other runtime service is required.

## Docker deployment (primary assignment workflow)

Build the image, start the API in a detached local container, and wait until the
real API accepts a request:

```bash
./scripts/deploy.sh
```

Successful deployment publishes the ready API at `http://localhost:8080`. From
another terminal, run the supplied-data demonstration request:

```bash
./scripts/call-api.sh
```

It calls `GET /meeting-slots` with a window covered by the supplied calendar and
fails unless the response contains at least one suitable interval.

Stop and remove the local deployment with:

```bash
docker rm --force meeting-scheduler-api-local
```

The deployment script does not replace an existing container with that name. If
startup fails after it creates the container, it prints the container logs and
removes the failed container.

## Test and build

```bash
npm ci
npm run typecheck
npm test
npm run build
```

The compiled application is written to `dist/`. To run it directly with Node.js:

```bash
npm start
```

The server loads and validates the supplied reference data before listening on port `8080`.

## Endpoint usage

From another terminal, send a request using UTC timestamps ending in `Z`:

```bash
curl --get http://localhost:8080/meeting-slots \
  --data-urlencode 'type=job-interview' \
  --data-urlencode 'start=2024-01-02T09:00:00Z' \
  --data-urlencode 'end=2024-01-02T10:00:00Z'
```

The request range is half-open: `start` is inclusive and `end` is exclusive. Results contain maximal continuous intervals; the API does not assume a meeting duration. A successful response has this shape:

```json
{
  "slots": [
    {
      "start": "2024-01-02T09:00:00.000Z",
      "end": "2024-01-02T10:00:00.000Z",
      "participants": [
        "abby.bond@example.com",
        "amelie.bryan@example.com"
      ]
    }
  ]
}
```

An empty `slots` array is a successful `200` response. Invalid or missing parameters return `400`; a valid range outside the calendar's authoritative coverage returns `422`; unsupported HTTP methods return `405`; and unexpected request-time failures return a non-leaking `500`. Error responses use the Problem Details shape documented in the [OpenAPI contract](docs/openapi.yaml).

The demonstration script in the primary Docker workflow sends this request and
prints the API's non-empty JSON response.
