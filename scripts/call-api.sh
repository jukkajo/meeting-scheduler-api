#!/usr/bin/env bash

set -Eeuo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but was not found in PATH." >&2
  exit 1
fi

curl \
  --fail-with-body \
  --silent \
  --show-error \
  --retry 10 \
  --retry-connrefused \
  --retry-delay 1 \
  --get http://localhost:8080/meeting-slots \
  --data-urlencode 'type=job-interview' \
  --data-urlencode 'start=2024-01-02T09:00:00Z' \
  --data-urlencode 'end=2024-01-02T10:00:00Z'

printf '\n'
