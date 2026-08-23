# Error Mapping

## Purpose

The API uses a small number of meaningful `error categories`. The `HTTP boundary` converts internal failures into the `public error contract`. `Application and domain code` do not select HTTP status codes.

## Error Categories

| Category | HTTP Status | Description |
|---|---|---|
| Validation/client error | 400 Bad Request | Request input does not satisfy the API contract |
| Known application failure | 422 Unprocessable Entity | A valid request cannot be completed because of business constraints |
| Unexpected request failure | 500 Internal Server Error | An unexpected runtime failure occurred during request processing |
| Startup failure | Process startup failure | Reference data cannot be loaded, parsed, validated, or canonicalized |

## Empty Results

A valid meeting search request with no suitable meeting intervals is not
an error.

``` json
{
  "slots": []
}
```

returns:

``` text
200 OK
```

## Error Mapping Flow

``` mermaid
flowchart LR

    Failure[Failure Occurs]

    Failure --> Category{Failure Category}

    Category -->|Invalid request input| Validation[400 Bad Request]

    Category -->|Known application failure| Application[422 Unprocessable Entity]

    Category -->|Unexpected request failure| Internal[500 Internal Server Error]

    Category -->|Startup failure| Startup[Process Startup Failure]

    Validation --> Contract[Problem Details Contract]

    Application --> Contract

    Internal --> Contract

    Contract --> Response[HTTP Response]
```
