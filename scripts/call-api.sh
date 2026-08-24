#!/usr/bin/env bash

set -Eeuo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but was not found in PATH." >&2
  exit 1
fi

response="$(curl \
  --fail \
  --silent \
  --show-error \
  --get http://localhost:8080/meeting-slots \
  --data-urlencode 'type=job-interview' \
  --data-urlencode 'start=2024-01-02T09:00:00Z' \
  --data-urlencode 'end=2024-01-02T10:00:00Z')"

readonly non_empty_slots_pattern='"slots"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{'

if ! [[ "${response}" =~ ${non_empty_slots_pattern} ]]; then
  echo "Error: the supplied demonstration request returned no meeting slots." >&2
  echo "Response: ${response}" >&2
  exit 1
fi

printf '%s\n' "${response}"
