Example cron for daily health-check (UTC 00:05)

# Edit with: crontab -e
# Run a health-check script and append output to workspace/logs/opsbot-health.log
5 0 * * * /home/gru/.openclaw/workspace/scripts/health_check.sh >> /home/gru/.openclaw/workspace/logs/opsbot-health.log 2>&1

Notes:
- Create scripts/health_check.sh and make it executable
- Use absolute paths in cron
- If you want a systemd timer instead, create a service + timer unit
