#!/usr/bin/env bash
set -euo pipefail

sock_path="/var/run/docker.sock"

if [[ ! -S "$sock_path" ]]; then
  echo "[devcontainer] docker.sock is not mounted; skipping permission fix."
  exit 0
fi

if command -v setfacl >/dev/null 2>&1; then
  if sudo setfacl -m "u:vscode:rw" "$sock_path"; then
    echo "[devcontainer] Granted vscode rw access to docker.sock via ACL."
    exit 0
  fi
  echo "[devcontainer] ACL is not supported on docker.sock mount; using fallback."
fi

echo "[devcontainer] Falling back to group and mode based permission fix."
sock_gid="$(stat -c '%g' "$sock_path")"
group_name="$(getent group "$sock_gid" | cut -d: -f1 || true)"

if [[ -z "$group_name" ]]; then
  group_name="docker-host"
  sudo groupadd -f -g "$sock_gid" "$group_name" || true
fi

if [[ "$sock_gid" -ne 0 ]]; then
  sudo usermod -aG "$group_name" vscode
  sudo chgrp "$group_name" "$sock_path" || true
  sudo chmod g+rw "$sock_path"
  echo "[devcontainer] Applied group-based access via '$group_name'."
  exit 0
fi

sudo chmod 666 "$sock_path"
echo "[devcontainer] docker.sock group is root; applied mode 666 fallback for devcontainer usability."
