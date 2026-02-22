# Cleanup plan (OpenClaw host/workspace)

Scope: **/home/gru/.openclaw/workspace** only (repo/workspace inspection). This is a *careful, non-destructive* plan: verify first, prefer archiving/renaming over deletion, and **do not touch secrets/keys/volumes**.

Last reviewed: 2026-02-07

---

## ⚠️ Must NOT delete (or treat as “requires explicit human confirmation”)

### Secrets / credentials (workspace files)
- `deploy/*/.env` — typically contains or references secrets.
- `notes/*secrets*.md` and `notes/secrets-*.md` — may contain secret material or secret mappings.
- Any rendered runtime env file referenced by compose (example):
  - `VIKUNJA_RUNTIME_ENV_FILE` (path may be outside workspace)
  - `CONDUIT_RENDERED_TOML` (rendered Conduit config; **contains secrets**)

### Persistent service state (NOT in workspace, but critical)
These are *not* files in this repo, but are referenced by it and commonly get “cleaned up” accidentally:
- **Docker volumes** (contain durable data and/or signing keys):
  - `conduit_data` (Conduit state + **Matrix signing keys** + media)
  - `db-data` (Vikunja Postgres data)
  - `files` (Vikunja uploaded files)
- **Caddy state** (host-level; contains TLS certs/ACME account state): typically under `/var/lib/caddy` and/or `/etc/caddy`.

### Repo/continuity state
- `.git/` — repo history.
- `STATE.md`, `TASKS.md`, `MEMORY.md`, `memory/` — operational continuity.

Rule of thumb: if you’re not 100% sure it’s regenerated automatically, do not delete—archive it.

---

## What looks safe to clean up (based on inspection)

### 1) Empty / scratch directories
- `tmp/` — currently empty. Safe to keep as scratch; safe to remove contents periodically.

### 2) Large “backup of disabled plugin” artifact
- `backups/matrix.disabled-20260206T222830Z/` (~59 MB)
  - Appears to be a backup of an old/disabled Matrix plugin code + its `node_modules` remnants.
  - **Safer approach:** compress and move out of the hot workspace (or delete only after confirming rollback is unnecessary).

### 3) Regenerable dependencies
- `node_modules/` (~14 MB)
  - Regenerable via `npm ci` / `npm install`.
  - Only remove if you’re certain nothing is relying on it at runtime *right now*.

### 4) Reports (documentation outputs)
- `reports/` (small)
  - Likely safe to archive if you want a slimmer workspace; keep if still referenced.

---

## Ordered checklist (minimize risk)

### Phase 0 — Safety prep (no deletions)
1. Confirm what is *authoritative* for secrets (Bitwarden SM vs plaintext `.env`).
2. Confirm Docker volumes exist and are healthy **before** touching anything:
   - `conduit_data`, `db-data`, `files`.
3. Identify where `CONDUIT_RENDERED_TOML` and `VIKUNJA_RUNTIME_ENV_FILE` point on this host.
4. If you plan to remove any artifacts, decide on a fallback:
   - Prefer: archive to a dated tarball, or move to an “attic” directory outside the repo.

### Phase 1 — Quick wins (very low risk)
5. Clear scratch space (if it accumulates later): remove only *contents* of `tmp/`.
6. Optionally prune obvious editor/OS cruft if present in future (none observed): `*.swp`, `*~`, `.DS_Store`, etc.

### Phase 2 — Archive big, non-secret backups
7. Handle `backups/matrix.disabled-20260206T222830Z/`:
   - Verify the active Matrix plugin is working and no longer needs this rollback copy.
   - Archive instead of delete (preferred):
     - create `backups-archive/` (outside repo or at least outside active workspace)
     - compress the directory to `matrix.disabled-20260206T222830Z.tgz`
   - After a cooling-off period (e.g., 7–30 days), delete the original directory if confident.

### Phase 3 — Regenerate dependencies (only if desired)
8. If workspace size matters or you need a “clean install”:
   - Remove `node_modules/` and reinstall from `package-lock.json`.
   - Do this only when you can tolerate brief downtime for any scripts depending on it.

### Phase 4 — Docs tidy (optional)
9. If you want a smaller repo footprint:
   - Archive older `reports/` to a dated tarball.
   - Keep anything still linked from `STATE.md`/`TASKS.md`/runbooks.

---

## “Do not clean” reminders (common footguns)
- Do **not** run `docker volume prune` on this host unless you have verified backups and understand what will be removed.
- Do **not** delete `conduit_data`—it includes Matrix server keys; deletion can permanently break federation identity.
- Do **not** remove host Caddy state directories unless intentionally re-issuing certificates.

---

## Suggested follow-up (optional)
- Add a small `notes/attic/README.md` convention: anything safe-but-noisy gets moved there with a timestamp rather than deleted.
