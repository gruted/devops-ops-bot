# devops-ops-bot (MVP)

A tiny DevOps “ops bot” prototype: collect basic host health signals (CPU/mem/disk/uptime), evaluate thresholds, and optionally alert + run a restart command.

This repo ships a Node.js CLI:

- `devops-watch check` – one-shot health check (good for cron/CI)
- `devops-watch cron-example` – prints an example crontab line

## MVP goals

- **Signal**: CPU load %, memory used %, disk used % (mount), uptime minutes
- **Decision**: status = `ok|warn|crit` from thresholds
- **Alert**: optional Slack/Discord-compatible webhook
- **Auto-recovery**: optional `--restart-cmd` on `crit` (or `warn`)

## Install (local)

```bash
cd devops-ops-bot
npm i
npm link   # installs devops-watch into your PATH
```

## Usage

### One-shot check

```bash
devops-watch check

devops-watch check \
  --warn-cpu 85 --crit-cpu 95 \
  --warn-mem 85 --crit-mem 95 \
  --warn-disk 85 --crit-disk 95 \
  --disk-mount / \
  --min-uptime-min 5
```

Exit codes:

- `0` = ok
- `1` = warn
- `2` = crit

### Webhook alert

```bash
export WEBHOOK="https://hooks.slack.com/services/..."  # or Discord webhook

devops-watch check --webhook-url "$WEBHOOK"
```

### Auto-restart on critical

```bash
devops-watch check \
  --webhook-url "$WEBHOOK" \
  --restart-cmd "systemctl restart nginx" \
  --restart-on crit
```

### Cron integration

```bash
devops-watch cron-example --every-min 5
```

Example output can be pasted into `crontab -e`.

## Notes / limitations

- Uses `systeminformation` for cross-platform metrics.
- Disk check picks the requested mount if present; otherwise first filesystem entry.
- Webhook payload is intentionally simple: sends both `{text}` (Slack) and `{content}` (Discord).

## Roadmap ideas

- Service/process health (systemd, pm2, docker containers)
- Node status aggregation (OpenClaw nodes: paired device heartbeats)
- Alert routing: email/SMS/PagerDuty
- “runbook links” per alert type
- Daemon mode + rate limiting + deduplication

## License

MIT (suggested; change as needed)

## Tests & linting

Run the Node check locally (same as CI):

```bash
npm run check
```

Lint the shell scripts (requires `shellcheck`):

```bash
shellcheck scripts/*.sh
```

# CI

GitHub Actions (`.github/workflows/ci.yml`) runs both the Node check and shellcheck linting on every push/PR.

## Ops scripts

### Weekly audit
```
./scripts/weekly_audit.sh              # prints markdown
./scripts/weekly_audit.sh --out notes/audit-weekly.md
```
Requirements: `docker` (optional; falls back if unavailable), `systemctl`, `openclaw nodes status` for paired-node info.

### GitHub bug report
```
./scripts/gh_bug_report.sh > notes/gh-bugs.md
```
Requirements: authenticated `gh` CLI (uses existing login), `jq`.
