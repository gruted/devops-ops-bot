#!/usr/bin/env sh
set -e

if [ "$#" -eq 0 ]; then
  set -- check
fi

exec node /app/bin/devops-watch.js "$@"
