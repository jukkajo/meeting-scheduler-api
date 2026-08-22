# Contributing

This project follows a lightweight branch-based workflow. Workflows should be updated to match current needs. Changes should be developed on short-lived branches and merged into `main` after verification. The purpose of this file is to support maintainability and consistent development practices.

## AI-Assisted Contributions

AI tools may be used to assist development, but contributors remain responsible for all submitted changes.

AI-assisted changes should:

* be reasonably scoped;
* be understood and reviewed by the contributor;
* follow the project architecture and conventions;
* include appropriate tests and documentation when applicable;
* avoid exposing secrets or private data;
* avoid introducing code with unclear licensing or origin.

Generated changes which have not been inspected and validated should not be submitted.

AI-assisted changes should be disclosed, when that context would help understand the change.

## Development Workflow

Start from the latest `main` branch:

```bash
git switch main
git pull --ff-only
git switch -c <type>/<short-description>
```

Develop and verify the change, then commit it:

```bash
git add .
git commit -m "<type>(<scope>): <summary>"
```

Merge completed changes back into `main`.

Do not commit directly to `main`.

## Branching Convention

Branches should contain one logical change and use:

```text
<type>/<short-description>
```

### Types

| Type       | Use                                  |
| ---------- | ------------------------------------ |
| `feat`     | New functionality                    |
| `fix`      | Defect correction                    |
| `refactor` | Behavior-preserving restructuring    |
| `test`     | Test-only changes                    |
| `docs`     | Documentation changes                |
| `build`    | Build, dependency, or Docker changes |
| `ci`       | Continuous-integration changes       |
| `chore`    | Repository maintenance               |

Examples:

```text
feat/people-directory-parser
feat/freebusy-parser
fix/interval-boundary-handling
docs/document-business-rules
build/minimize-docker-image
```

## Commit Convention

Use Conventional Commits:

```text
<type>(<scope>): <summary>
```

Examples:

```text
feat(scheduling): add people directory parser
fix(scheduling): handle adjacent busy intervals
test(scheduling): cover invalid freebusy periods
docs(adr): document in-memory reference data
build(docker): add production image
```

Common commit types:

```text
feat, fix, refactor, perf, test, docs, build, ci, chore, revert
```

Keep commit summaries concise and lowercased.

## Documentation

Update documentation when a change affects:

* public behavior;
* setup or development workflow;
* API contracts;
* business rules;
* integration behavior;
* system architecture;
* security assumptions.

Significant architectural decisions should be recorded as Architecture Decision Records under `docs/adr/`.

Implementation and design details like domain models or complex concepts belong under `docs/design/` when they require explanation beyond the source code.