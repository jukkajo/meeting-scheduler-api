#!/usr/bin/env bash

set -Eeuo pipefail

readonly image_name="meeting-scheduler-api:local"
readonly container_name="meeting-scheduler-api-local"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required but was not found in PATH." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is installed, but the Docker daemon is unavailable." >&2
  exit 1
fi

if docker container inspect "${container_name}" >/dev/null 2>&1; then
  echo "Error: container '${container_name}' already exists." >&2
  echo "Stop it with: docker stop ${container_name}" >&2
  exit 1
fi

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_directory}/.." && pwd)"

echo "Building ${image_name}..."
docker build --tag "${image_name}" "${project_root}"

echo "Starting ${container_name} on http://localhost:8080..."
docker run \
  --detach \
  --rm \
  --name "${container_name}" \
  --publish 8080:8080 \
  "${image_name}"

echo "Deployment started. Run ./scripts/call-api.sh to demonstrate the API."
