# DevOps Ops Bot — Status Dashboard

_Last updated: 2026-02-20_

## Scheduled jobs
- Weekly machine audit: **not yet installed as cron** (script exists: `scripts/weekly_audit.sh`)
- Weekly GitHub bug scan: **manual** (script exists: `scripts/gh_bug_report.sh`)

## Latest signals
### Machine audit
- Latest snapshot: `notes/audit-weekly.md` (2026-02-20)
- Notable: `nginx.service` is **failed** per `systemctl --failed`.
  - Next: investigate whether nginx is expected to run on this host; if yes, fix config/startup.

### GitHub bugs
- Last scan: 2026-02-20 (see `notes/gh-bugs.md`)
- Result: no open issues labeled `bug` found in scanned repos.

## Backlog / Next actions
- [ ] Decide whether nginx should be enabled on srv1325560.
- [ ] Add cron entries (see `notes/devops-ops-bot.md`).
- [ ] Add GitHub bug triage automation (spawn fix subagents in main session).
