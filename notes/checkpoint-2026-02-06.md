# Checkpoint — 2026-02-06 (UTC)

Audience: Ted + gru (resume after context reset)

## TL;DR status
- **Bitwarden Secrets Manager (SM) + `bws` + systemd wiring:** configured and documented.
- **Vikunja:** required SM secrets were created (values not printed).
- **Pending:** deploy Vikunja via Docker, decide Matrix approach + create Matrix secrets, and confirm where Ted’s Bitwarden “import” landed (Vault items vs SM) + migrate needed values.

---

## What’s configured (current state)

### Bitwarden Secrets Manager
- **SM project:** `openclaw-prod`
- **Project ID:** `51ba57e6-de28-47ef-82ec-b3e9012ec71a`
- **OpenClaw runtime secret keys present in SM:**
  - `OPENAI_API_KEY`
  - `OPENCLAW_GATEWAY_TOKEN`

### `bws` CLI + machine token bootstrap
- `bws` CLI is installed and usable (able to list the single SM project + secrets).
- Machine/service access token is stored locally at:
  - `~/.config/openclaw/bitwarden-sm.token` (expected perms **0600**)
- **Safety pattern:** fetch secrets at runtime without printing values:
  - Use `bws … --output env` redirected straight into a perms-locked file under `/run/user/<uid>/openclaw/`.

### systemd user service drop-in (OpenClaw Gateway)
- OpenClaw gateway runs as a **systemd user** service.
- A drop-in is set up (per `notes/bitwarden-setup.md`) to:
  1) run an `ExecStartPre` wrapper that fetches SM secrets, and
  2) load them via `EnvironmentFile=/run/user/%U/openclaw/secrets.env`, and
  3) set non-secret `OPENCLAW_BWS_PROJECT_ID=51ba57e6-de28-47ef-82ec-b3e9012ec71a`.

### Known “secret sprawl” still present (recommended cleanup, not necessarily done)
Per `notes/secrets-env-mapping.md`, sensitive values may exist in multiple places:
- `OPENAI_API_KEY` in `/home/gru/.openclaw/.env` (plaintext)
- `OPENCLAW_GATEWAY_TOKEN` inline in the systemd unit *and* in `openclaw.json` (`gateway.auth.token`) *and* in Bitwarden SM

Recommendation (pending): converge on **Bitwarden SM as source of truth** + remove duplicates once confirmed working.

---

## What’s done

### Vikunja secrets created (Bitwarden SM)
Created in SM project `openclaw-prod` with strong random values (values not printed):
- `POSTGRES_PASSWORD`
- `VIKUNJA_DATABASE_PASSWORD` (set equal to `POSTGRES_PASSWORD`)
- `VIKUNJA_SERVICE_JWTSECRET`

Reference: `notes/vikunja-secrets.md` and `notes/bitwarden-import-reconcile.md`.

---

## What’s pending / next steps

### 1) Deploy Vikunja (Docker)
- Implement the `deploy/vikunja/*` plan (see `deploy/vikunja/README.md` referenced in notes).
- Ensure the docker compose/service reads:
  - database password(s)
  - Vikunja JWT secret
  - (optional) frontend URL / mailer settings
- Decide how secrets are injected for the Vikunja stack:
  - reuse the Bitwarden SM → env-file pattern, or
  - create a dedicated env file + strict permissions, or
  - Docker secrets (if supported in your chosen setup)

### 2) Matrix setup decisions (blocks secret creation)
Matrix secrets were **not** created automatically because they depend on environment-specific choices.
Decide:
- Which homeserver URL?
- Bot authentication method?
  - password login (`MATRIX_BOT_USER_ID` + `MATRIX_BOT_PASSWORD`), or
  - pre-provisioned `MATRIX_ACCESS_TOKEN` + `MATRIX_DEVICE_ID`
- Which room(s) / policies? (room IDs, allowlists)

Once decided, create the corresponding SM secrets (keys proposed in `notes/bitwarden-import-reconcile.md`).

### 3) Confirm where Ted’s Bitwarden “import” landed
- `bws` cannot see Vault items; it only sees SM projects/secrets.
- Evidence indicates the import likely landed in **Bitwarden Vault items**, not SM.

Action in Bitwarden UI:
- Check **Vault** for the imported items.
- Decide which values belong in **Secrets Manager**.
- Manually create SM secrets for those values using stable env-var-style keys.

### 4) Cleanup / hardening follow-ups (optional but recommended)
- Remove plaintext `/home/gru/.openclaw/.env` once OpenClaw reads `OPENAI_API_KEY` from SM-generated env.
- Remove the gateway token from:
  - systemd unit `Environment=OPENCLAW_GATEWAY_TOKEN=…`
  - `openclaw.json` (`gateway.auth.token`)
  after confirming the runtime EnvironmentFile path works.
- Consider rotating any secrets that may have been exposed during earlier experimentation.

---

## Safety notes (do not skip)
- **Never print secrets** to terminal/stdout/stderr/journald.
  - Avoid `bws … --output table` (tables print values).
  - Do not use `set -x` in wrappers.
- Keep generated env files out of the repo/workspace; prefer `/run/user/<uid>/openclaw/` with **0600**.
- If any plaintext secret export occurred (e.g. `/tmp/*.env`), treat it as exposure:
  - delete the file(s)
  - rotate affected credentials

---

## Pointers to the key workspace docs
- `notes/bitwarden-setup.md` — safe `bws` wrapper + systemd drop-in pattern
- `notes/secrets-env-mapping.md` — which env vars OpenClaw reads + where secrets currently live
- `notes/bitwarden-import-reconcile.md` — import likely landed in Vault + what Vikunja secrets were created
- `notes/vikunja-secrets.md` — Vikunja secret key names (keys only)
