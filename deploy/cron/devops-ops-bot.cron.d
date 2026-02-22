# /etc/cron.d/devops-ops-bot
# Managed by OpenClaw devops-ops-bot repo.
# Times are UTC on this host unless cron is configured otherwise.

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Weekly audit every Friday at 02:05 UTC
5 2 * * 5 gru cd /home/gru/.openclaw/workspace && /home/gru/.openclaw/workspace/scripts/weekly_audit.sh --out /home/gru/.openclaw/workspace/notes/audit-weekly.md

# Daily GitHub bug scan at 02:10 UTC
10 2 * * * gru cd /home/gru/.openclaw/workspace && /home/gru/.openclaw/workspace/scripts/gh_bug_report.sh gruted > /home/gru/.openclaw/workspace/notes/gh-bugs.md
