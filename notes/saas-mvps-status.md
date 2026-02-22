# SaaS MVPs — status + launch plan

Updated: 2026-02-21 (UTC)

This note summarizes 5 “sellable” MVPs found in the workspace (bots/CLIs) and what’s needed to push them to a deployable SaaS or hosted offering.

---

## 1) DevOps Ops Bot → **Hosted health checks + auto-remediation**

**Workspace:** `devops-ops-bot/`

**What it is (MVP):** Node CLI `devops-watch` that collects CPU/mem/disk/uptime, evaluates thresholds, optionally posts to Slack/Discord webhook, and can run a restart command on `warn/crit`.

**Current repo status:**
- Git: clean, up to date with origin
- HEAD: `9071fff` (“MVP: devops-watch CLI (check/webhook/restart) + plan”)
- Existing ops docs: `devops-ops-bot/devops-bot-status.md`
- Cron example file exists: `devops-ops-bot/devops-ops-bot.cron` (but note: it references `scripts/weekly_audit.sh` and `scripts/gh_bug_report.sh` in the workspace, not `devops-watch` itself)

**Closest SaaS packaging:** “Health check as a service” for small VPS fleets.
- Input: agent/CLI installed on customer host(s)
- Output: webhook alerts + dashboard

**Next steps (fastest path):**
1. **Ship a minimal agent install story** (1 command + config file):
   - `npm i -g @gruted/devops-watch` (or a curl installer)
   - `/etc/devops-watch/config.json` for thresholds + webhook + restart cmd
2. **Add dedupe + rate limiting** (don’t spam on persistent crit).
3. **Add a hosted “inbox” API** for check-ins (agent posts JSON → server stores + renders status page).
4. (Optional) **Systemd unit** for daemon mode (or “cron-only” with state file).

**Deploy/launch suggestion:**
- Phase 0: cron + webhook only (no server) → sell as “ops agent + setup”.
- Phase 1: small hosted API + dashboard (Fly.io/Render) + per-host API keys.

---

## 2) Doc Ops Bot → **Document-to-markdown extraction service**

**Workspace:** `doc-ops-bot/`

**What it is (MVP):** Python CLIs:
- `python -m doc_ops --input <file> --out <md>` (text extraction)
- `python -m doc_ops.insights --input <file> --out <md>` (insights, OCR/table extraction best-effort)

**Current repo status:**
- Git: clean, up to date with origin
- HEAD: `ec530dc` (“Add doc-insights CLI with OCR/table extraction and demo PDF”)

**Closest SaaS packaging:** “Upload a PDF/image → get structured markdown + key signals.”
- ICP: consultants, compliance teams, sales ops, internal knowledge base teams

**Next steps (fastest path):**
1. Wrap as **HTTP API** (FastAPI) with:
   - `POST /extract` → returns markdown + JSON metadata
   - `POST /insights` → returns markdown + tables + warnings (“tesseract missing”, etc.)
2. Add **storage**: keep artifacts 7 days; return signed download links.
3. Add a basic **web UI**: upload → preview markdown → copy/download.
4. Add “connectors” later (Drive/Dropbox/email ingestion).

**Deploy/launch suggestion:**
- Host on a single small VM (needs `poppler-utils` + `tesseract`).
- Charge per doc / per seat.

---

## 3) Inbox Triage Bot → **Daily email+calendar triage reports (Gmail)**

**Workspace:** `inbox-triage-bot/`

**What it is (MVP):** Node CLI `inbox-triage` that:
- fetches recent Gmail message metadata (read-only)
- fetches upcoming Google Calendar events (read-only)
- classifies/prioritizes emails (LLM optional; otherwise heuristics)
- outputs a markdown report

**Current repo status:**
- Git: clean, up to date with origin
- HEAD: `2e9603b` (“Add OAuth2 installed-app auth for headless Gmail”)

**Email-related blocker that is now unblocked:**
- This repo previously depended on “email auth in headless environments”.
- It now supports **OAuth2 installed-app** + token file (`GOOGLE_OAUTH_TOKEN_FILE`) for **personal Gmail** (one-time consent, then headless refresh), which is the key MVP unblock.

**Next steps (fastest path):**
1. Create a **cron-able wrapper** script:
   - runs `inbox-triage demo`
   - writes to `notes/inbox-triage-YYYY-MM-DD.md`
   - optionally posts the top section to a webhook / OpenClaw channel
2. Add **local cache/state** (message IDs triaged) to avoid re-triaging.
3. Add “safe snippets” (bounded, privacy-filtered) to improve classification.
4. Package as a **hosted** product by switching from local OAuth to:
   - Google OAuth web app + per-user consent in a hosted service
   - store refresh tokens encrypted

**Deploy/launch suggestion:**
- Phase 0: “local agent” (customer runs it locally; output to Slack).
- Phase 1: hosted triage (OAuth web flow) + daily delivery email/Slack.

---

## 4) Compliance Assist → **Regulatory change monitor + checklist generator**

**Workspace:** `compliance-assist/` (not currently a git repo)

**What it is (MVP):** Node CLI `compliance-watch` that:
- watches regulatory sources (RSS + web page snapshots)
- emits alerts (stdout + optional webhook)
- generates a compliance checklist (template-based, optional LLM hook)

**Current status:**
- Has `package.json` with `bin` + scripts (`check`, `lint`, `test`).
- Not under git in this workspace (no PR workflow yet).

**Next steps (fastest path):**
1. Initialize git + push repo (so it can accept PRs / CI).
2. Add **source normalization** and robust diffing (avoid false positives).
3. Add **multi-tenant config** model (per customer sources + alert channels).
4. Add hosted “digest” delivery (daily/weekly) + audit log.

**Deploy/launch suggestion:**
- Start as “hosted monitor” (server runs checks; customers configure sources + destinations).
- Charge per source / per seat.

---

## 5) Support Chatbot MVP → **FAQ bot + safe escalation routing**

**Workspace:** `support-chatbot/` (not currently a git repo)

**What it is (MVP):** Node CLI that:
- matches user messages to a small FAQ set (deterministic similarity)
- classifies for escalation (security/fraud/legal triggers)
- optionally sends escalation into an OpenClaw channel if configured (`OPENCLAW_TARGET`)

**Current status:**
- Has runnable scripts: `npm run demo`, `npm run chat`, `npm test`
- Not under git in this workspace (no PR workflow yet).

**Next steps (fastest path):**
1. Initialize git + push repo.
2. Add **channel adapters**: web widget, email intake, Slack/Discord.
3. Add **conversation logging** (with redaction) + ticket creation integration.
4. Add admin UI for FAQ editing + escalation rules.

**Deploy/launch suggestion:**
- Phase 0: embed widget + Slack escalation.
- Phase 1: multi-tenant dashboard + pricing per conversation.

---

# Repo / PR status (quick)

- `devops-ops-bot`: clean on `master`, already pushed to `origin/master` (no pending PR).
- `doc-ops-bot`: clean on `main`, already pushed to `origin/main` (no pending PR).
- `inbox-triage-bot`: clean on `main`, already pushed to `origin/main` (no pending PR).
- `compliance-assist`: **not a git repo** in this workspace → needs `git init`, first commit, remote, push, then CI.
- `support-chatbot`: **not a git repo** in this workspace → needs `git init`, first commit, remote, push, then CI.

---

# Cross-cutting “launch” checklist (applies to all 5)

## Packaging
- Add versioning + changelog.
- Add `./scripts/release.sh` (tag + publish) for Node/Python packages.

## Deployment primitives
- A single “MVP hosting” template:
  - API (FastAPI/Express)
  - auth (API keys)
  - minimal billing placeholder (Stripe later)
  - logging + error tracking

## Sales assets
- 1-page landing + 60s demo GIF per product.
- A “pricing stub” (even if manual invoicing initially).

## What to do next (recommended order)
1. **Inbox Triage Bot**: easiest immediate value now that Gmail OAuth headless flow is in place; ship daily report + Slack/webhook.
2. **Doc Ops Bot**: wrap in FastAPI and ship upload → markdown.
3. **DevOps Ops Bot**: add agent check-in server + simple dashboard.
4. **Compliance Assist**: make it a git repo + hosted monitor.
5. **Support Chatbot**: make it a git repo + web widget + escalation.
