#!/usr/bin/env bash
set -euo pipefail

# Minimal entrypoint for dev container or docker image
CWD=$(dirname "$0")
cd "$CWD"

echo "Starting gruted-devops-ops-bot (MVP)"
# Default behavior: show available scripts
ls -la scripts || true

# If first arg is a script in scripts/, run it
if [ "$#" -gt 0 ] && [ -x "scripts/$1" ]; then
  exec "scripts/$1" "${@:2}"
fi

# Fallback: open a shell
exec /bin/bash
