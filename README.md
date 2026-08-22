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
* [Architecture decisions](docs/adr/) — major architectural decisions and their reasoning.