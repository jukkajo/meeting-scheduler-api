# Security Considerations

## Threat Surface

The main `trust boundaries` are:

- HTTP request input, including meeting type and time range.
- Supplied reference data (`people-directory.json` and iCalendar free/busy data).
- Parsing and conversion boundaries where external data becomes internal domain models.
- Container runtime configuration.

## Input Validation

External data and API input are validated before entering the `core and domain`.
Runtime validation is required because TypeScript types do not exist after code has
been compiled.

Validation covers:

- request structure and supported meeting types
- UTC time values and valid time ranges
- required fields and expected structure in supplied reference data
- supported iCalendar free/busy input

Invalid input should fail before producing scheduling results.

## Error Handling

Errors returned through the API should not expose internal implementation details. Unexpected failures should return `stable HTTP error responses` rather than sensitive and detailed runtime information.

## Container Security

The deployment should:

- run the application as a non-root user
- use a minimal runtime image
- avoid unnecessary packages and tools
- expose only the required application port 8080

## Out of Scope

The following are outside the scope of this assignment:

- authentication and authorization;
- permission policies
- public internet exposure;
- TLS configuration;
- persistent storage security;
- secret management;
- production rate limiting;
- distributed deployment concerns.

These should be addressed if the service evolves beyond the assignment's `local read-only deployment model`.
