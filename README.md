# gruted-devops-ops-bot

Extracted MVP of devops-ops-bot for quick local iteration.

Contents:
- scripts/  (copied)
- notes/    (copied)
- deploy/   (copied)
- cron/     (copied)

Included helper files:
- .github/workflows/ci.yml — basic CI to lint/test
- entrypoint.sh — container / dev entrypoint
- issues.json — draft GH issues for import via gh CLI

How to use:
1. Inspect scripts/ and deploy/ to understand runbooks and automation.
2. Adjust CI and entrypoint as needed for your runtime.
3. Use `gh issue create --fill` or `gh issue create --json-file issues.json` to post (do not post automatically).