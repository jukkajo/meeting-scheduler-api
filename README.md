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

## Local usage

Requires Node.js 20.19 or later.

```bash
npm ci
npm run build
npm start
```

The server loads and validates the supplied reference data before listening on port `8080`. From another terminal:

```bash
curl --get http://localhost:8080/meeting-slots \
  --data-urlencode 'type=job-interview' \
  --data-urlencode 'start=2024-01-02T09:00:00Z' \
  --data-urlencode 'end=2024-01-02T10:00:00Z'
```

Run all repository checks with:

```bash
npm run typecheck
npm test
npm run build
```
