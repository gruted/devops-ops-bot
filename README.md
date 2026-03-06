# devops-ops-bot

[![ClawHub](https://img.shields.io/badge/ClawHub-devops--ops--bot-blue)](https://clawhub.com/skills/devops-ops-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/gruted/devops-ops-bot?style=social)](https://github.com/gruted/devops-ops-bot)

Lightweight server health monitoring with alerts and auto-recovery. One command, zero config to start.

## What you get

- **CPU / Memory / Disk / Uptime** checks with configurable thresholds
- **Slack or Discord alerts** via webhooks
- **Auto-restart** commands on critical conditions
- **JSON output** for piping into dashboards or log aggregators
- **Docker image** for containerized deployments
- **Cron-ready** — runs as a one-shot check, exits with status codes

## Quick start

### Option 1: npx (no install)

```bash
npx @gruted/devops-ops-bot check
```

### Option 2: npm install

```bash
npm install -g @gruted/devops-ops-bot
devops-watch check
```

### Option 3: Docker

```bash
docker run --rm ghcr.io/gruted/devops-ops-bot:latest check
```

### Option 4: One-liner install script

```bash
curl -fsSL https://raw.githubusercontent.com/gruted/devops-ops-bot/main/install.sh | bash
```

## Usage

### Basic health check

```bash
devops-watch check
# [OK] myhost cpu=12.3%(ok) mem=65.2%(ok) disk(/)=45.1%(ok) uptime=1440m(ok)
```

Exit codes: `0` = ok, `1` = warn, `2` = crit

### Custom thresholds

```bash
devops-watch check \
  --warn-cpu 80 --crit-cpu 95 \
  --warn-mem 80 --crit-mem 95 \
  --warn-disk 80 --crit-disk 95 \
  --disk-mount / \
  --min-uptime-min 5
```

### JSON output

```bash
devops-watch check --json
```

Returns full metrics object with hostname, platform, per-metric levels, and thresholds — ready for log ingestion or dashboards.

### Webhook alerts (Slack / Discord)

```bash
devops-watch check --webhook-url "https://hooks.slack.com/services/T.../B.../xxx"
```

Works with both Slack (`{text}`) and Discord (`{content}`) webhook formats.

### Auto-restart on critical

```bash
devops-watch check \
  --webhook-url "$WEBHOOK" \
  --restart-cmd "systemctl restart nginx"
```

Runs the restart command when status is `crit`. Combine with cron for self-healing infrastructure.

### Cron setup

```bash
# Check every 5 minutes, alert to Slack
*/5 * * * * devops-watch check --webhook-url "$WEBHOOK" >> /var/log/devops-watch.log 2>&1
```

Or generate a cron line:

```bash
devops-watch cron-example --every-min 5
```

## Pricing

| Plan | Price | What's included |
|------|-------|----------------|
| **Ops Basic** | $10/mo per node | Health checks, alerts, cron setup support |
| **Ops Bundle** | $49/mo up to 10 nodes | Everything in Basic + auto-restart, priority support, onboarding call |

→ [Get Ops Basic](https://buy.stripe.com/7sY28rg6e4sc2V91hMew800)
→ [Get Ops Bundle](https://buy.stripe.com/14AfZh6vEaQA0N1e4yew801)

## Configuration reference

| Flag | Default | Description |
|------|---------|-------------|
| `--warn-cpu <pct>` | 85 | Warn threshold for CPU load % |
| `--crit-cpu <pct>` | 95 | Critical threshold for CPU load % |
| `--warn-mem <pct>` | 85 | Warn threshold for memory used % |
| `--crit-mem <pct>` | 95 | Critical threshold for memory used % |
| `--warn-disk <pct>` | 85 | Warn threshold for disk used % |
| `--crit-disk <pct>` | 95 | Critical threshold for disk used % |
| `--disk-mount <path>` | `/` | Filesystem mount to check |
| `--min-uptime-min <n>` | 5 | Alert if uptime below this (minutes) |
| `--webhook-url <url>` | — | Slack/Discord webhook URL |
| `--restart-cmd <cmd>` | — | Shell command to run on critical |
| `--json` | false | Output full JSON metrics |

## Docker

```bash
# Build locally
docker build -t devops-watch .

# Run with custom thresholds
docker run --rm devops-watch check --warn-mem 80 --crit-mem 95

# Published image
docker run --rm ghcr.io/gruted/devops-ops-bot:latest check
```

## CI / GitHub Actions

The repo includes `.github/workflows/ci.yml` which runs health checks and linting on every push/PR.

## License

MIT
