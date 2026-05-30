#!/usr/bin/env sh
set -eu

if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
fi

# Last-resort fallback: run Compose v2 as a container.
if docker info >/dev/null 2>&1; then
  exec docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$PWD":"$PWD" \
    -w "$PWD" \
    docker/compose:2.27.0 "$@"
fi

echo "No Docker Compose command found (tried: 'docker compose', 'docker-compose', 'docker run docker/compose')." >&2
echo "Install Docker Compose v2 plugin or docker-compose v1, then retry." >&2
exit 127
