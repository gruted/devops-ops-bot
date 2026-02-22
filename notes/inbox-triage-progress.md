# Inbox Triage Bot MVP – progress log

## 2026-02-20
- Confirmed tooling available on host:
  - `himalaya` at `/home/linuxbrew/.linuxbrew/bin/himalaya` (supports `envelope list -o json`).
  - `gog` at `/home/linuxbrew/.linuxbrew/bin/gog` (v0.9.0) with `calendar events --json`.
- Located workspace; no existing inbox-triage-bot repo yet.
- Next: scaffold new repo `inbox-triage-bot/`, implement Node CLI prototype that:
  - fetches latest INBOX envelopes via himalaya JSON
  - checks upcoming calendar events via gog JSON
  - classifies emails via LLM (OpenAI if key present; heuristic fallback)
  - prints markdown triage report + action recommendations.

### Scaffolding done
- Created repo dir `inbox-triage-bot/` and initialized git (branch `main`).
- Bootstrapped npm project and installed deps: `execa`, `zod`, `dotenv`, `openai`, `chalk`; dev: `prettier`.
- Added initial code scaffolding:
  - `src/lib/himalaya.js` → fetch envelopes via `himalaya envelope list -o json`
  - `src/lib/gogCalendar.js` → fetch upcoming events via `gog calendar events --json`
  - `src/lib/exec.js` wrapper around `execa`
  - Updated `package.json` (ESM, bin `inbox-triage`, scripts)
- Implemented MVP logic:
  - `src/lib/classifier.js`: OpenAI JSON-schema classification (env `OPENAI_API_KEY`) with heuristic fallback
  - `src/lib/recommend.js`: action recommendations based on triage buckets + upcoming events
  - `src/lib/report.js`: markdown report renderer
  - `src/cli.js`: CLI commands (`demo`, `email:fetch`, `email:triage`, `calendar:upcoming`)

### Fixes / integration notes
- Resolved npm dependency conflict by downgrading `zod` to v3 (OpenAI SDK peerOptional expects zod v3).
- Updated integrations to support multi-account configs:
  - `GOG_ACCOUNT` env → passed as `gog --account=...`
  - `HIMALAYA_ACCOUNT` env → passed as `himalaya envelope list -a ...`
- Added `.env.example`.
- Improved resilience:
  - Demo mode continues if himalaya/gog aren’t configured (prints warnings, generates empty report).
- Committed MVP to git.
