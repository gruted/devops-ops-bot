# DevOps Ops Bot MVP – Spec / Stories / Stack

## Problem

Small servers and hobby deployments often lack a lightweight “last mile” watchdog that:

- checks host health on a schedule
- alerts a human when thresholds are exceeded
- optionally kicks off a safe, pre-approved recovery action

## MVP scope

### In-scope

1. **Host metrics** (single machine)
   - CPU load percentage
   - Memory used percentage
   - Disk used percentage (configurable mount)
   - Uptime minutes (detect reboot)

2. **Evaluation / status**
   - thresholds for warn/crit
   - outputs summary line and/or JSON
   - exit code conveys status for cron/CI

3. **Alerting**
   - Slack/Discord webhook URL
   - includes human-readable summary + JSON details

4. **Auto-recovery (optional)**
   - run a shell `--restart-cmd` on status >= configured level
   - report success/failure (stdout/stderr) and optionally send to webhook

5. **Cron friendliness**
   - one-shot execution
   - sample crontab entry generator

### Out-of-scope (for MVP)

- long-running daemon with state / dedupe
- multi-host aggregation
- authentication / secrets management
- complex remediation workflows

## User stories

- As an operator, I can run `devops-watch check` and see whether my server is healthy.
- As an operator, I can run it from cron and rely on exit codes to trigger external monitoring.
- As an operator, I can receive a webhook alert when memory/disk/cpu exceeds thresholds.
- As an operator, I can automatically restart a service on critical conditions.
- As an operator, I can tune thresholds and pick which disk mount to check.

## Stack choices

- **Node.js CLI** (simple distribution, easy scripting)
- **systeminformation** npm package for portable host metrics
- **commander** for CLI parsing
- **fetch** (built-in in Node 18+) for webhooks

## Future (phase 2+) ideas

- Add checks:
  - systemd unit status (`systemctl is-active`)
  - port check / HTTP healthcheck
  - docker container health (via `docker ps` + inspect)
- Alert policies:
  - rate limiting / dedupe window
  - severity-based routing
  - “runbook URL” field
- Aggregation:
  - run on multiple nodes and publish to a central endpoint
  - OpenClaw node status integration
