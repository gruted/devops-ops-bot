#!/bin/bash
# health_check.sh - simple workspace health check
set -euo pipefail
echo "["$(date -u +"%Y-%m-%dT%H:%M:%SZ")"] health-check: workspace reachable"
# Example checks (add as needed): disk space, recent logs, process checks
df -h / | awk 'NR==2{print "disk_avail:"$4}'
echo "done"
