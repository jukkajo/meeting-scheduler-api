#!/usr/bin/env bash

set -Eeuo pipefail

readonly image_name="meeting-scheduler-api:local"
readonly container_name="meeting-scheduler-api-local"
readonly readiness_timeout_seconds=30

container_owned=false

cleanup_failed_deployment() {
  local exit_code=$?

  if (( exit_code == 0 )) || [[ "${container_owned}" != true ]]; then
    return
  fi

  echo "Container logs:" >&2
  docker logs "${container_name}" >&2 || echo "No container logs were available." >&2
  echo "Removing failed container '${container_name}'..." >&2
  docker rm --force "${container_name}" >/dev/null 2>&1 || true
}

trap cleanup_failed_deployment EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required but was not found in PATH." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is installed, but the Docker daemon is unavailable." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required for the deployment readiness check." >&2
  exit 1
fi

if docker container inspect "${container_name}" >/dev/null 2>&1; then
  echo "Error: container '${container_name}' already exists." >&2
  echo "Remove it with: docker rm --force ${container_name}" >&2
  exit 1
fi

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_directory}/.." && pwd)"

echo "Building ${image_name}..."
docker build --tag "${image_name}" "${project_root}"

echo "Starting ${container_name} on http://localhost:8080..."
if ! docker run \
  --detach \
  --name "${container_name}" \
  --publish 8080:8080 \
  "${image_name}" >/dev/null; then
  if docker container inspect "${container_name}" >/dev/null 2>&1; then
    container_owned=true
  fi

  echo "Error: failed to start container '${container_name}'." >&2
  exit 1
fi
container_owned=true

echo "Waiting for the API to become ready..."
readiness_deadline=$((SECONDS + readiness_timeout_seconds))

while (( SECONDS < readiness_deadline )); do
  if curl \
    --fail \
    --silent \
    --output /dev/null \
    --max-time 2 \
    --get http://localhost:8080/meeting-slots \
    --data-urlencode 'type=job-interview' \
    --data-urlencode 'start=2024-01-02T09:00:00Z' \
    --data-urlencode 'end=2024-01-02T10:00:00Z'; then
    echo "Deployment ready at http://localhost:8080."
    echo "Run ./scripts/call-api.sh to demonstrate the API."
    exit 0
  fi

  if [[ "$(docker container inspect --format '{{.State.Running}}' "${container_name}" 2>/dev/null)" != true ]]; then
    echo "Error: container '${container_name}' stopped during startup." >&2
    exit 1
  fi

  sleep 1
done

echo "Error: API did not become ready within ${readiness_timeout_seconds} seconds." >&2
exit 1
