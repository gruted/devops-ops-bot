# DevOps Ops Bot (MVP) — SOP

Goal: lightweight DevOps "ops bot" that (1) captures a weekly machine audit snapshot, (2) scans GitHub for open bugs across `gruted/*`, and (3) maintains a simple status dashboard.

This MVP is intentionally **file-based** (writes markdown into `notes/`) so it’s easy to review in git and safe to run unattended.

## Files
- Weekly audit log: `notes/audit-weekly.md`
- Status dashboard: `notes/devops-bot-status.md`
- (Optional) Bug report output: `notes/gh-bugs.md`

## Scripts
### 1) Weekly machine audit
- Script: `scripts/weekly_audit.sh`
- Writes: appends a dated section into `notes/audit-weekly.md`

Run manually:
```bash
cd /home/gru/.openclaw/workspace
scripts/weekly_audit.sh --out notes/audit-weekly.md
```

What it checks:
- uptime/load, disk, memory
- failed systemd units
- nginx status (quick visibility)
- docker ps (best-effort; may require permissions)

### 2) GitHub bug scan across gruted/*
- Script: `scripts/gh_bug_report.sh`
- Requires: `gh` CLI logged in (`gh auth status`)

Run manually:
```bash
cd /home/gru/.openclaw/workspace
scripts/gh_bug_report.sh gruted > notes/gh-bugs.md
```

Notes:
- The original spec mentions "spawn subagents to fix/PRs". In OpenClaw this should be done from the **main agent session** (not from a depth-1 subagent) so it can coordinate multiple fix subagents safely.

## Cron setup (recommended)
Create a cron file and install via `crontab -e` (or your preferred deployment path).

Example entries (UTC):
```cron
# Weekly audit every Friday at 02:05 UTC
5 2 * * 5 cd /home/gru/.openclaw/workspace && /home/gru/.openclaw/workspace/scripts/weekly_audit.sh --out /home/gru/.openclaw/workspace/notes/audit-weekly.md

# Daily GitHub bug scan at 02:10 UTC
10 2 * * * cd /home/gru/.openclaw/workspace && /home/gru/.openclaw/workspace/scripts/gh_bug_report.sh gruted > /home/gru/.openclaw/workspace/notes/gh-bugs.md
```

If you want a single "dashboard refresh" script, add a wrapper script that runs both and then updates `notes/devops-bot-status.md`.

## Triage loop (human-in-the-loop)
1. Review `notes/audit-weekly.md` for red flags (failed units, disk pressure, memory pressure).
2. Review `notes/gh-bugs.md` for new/old bugs.
3. From main agent session: choose top bugs → spawn fix subagents → open PRs.

## Known issues / follow-ups
- `docker ps` can return permission denied; either add the runner user to the `docker` group or keep it best-effort.
- `journalctl` output may be restricted depending on user groups.
