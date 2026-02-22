# Bitwarden import reconciliation plan (Vault vs Secrets Manager)

When: 2026-02-07 (UTC)

## Context / what we know
- `bws` (Bitwarden **Secrets Manager** CLI) can only see **SM Projects + Secrets**.
  - It **cannot** list/search Bitwarden **Vault items** (Logins, Secure Notes, etc.).
- Workspace notes indicate Ted did a Bitwarden “import”. If the expected values are not visible via `bws`, they likely landed in the **Vault**, not in **Secrets Manager**.
- Existing SM project in use: `openclaw-prod` (`51ba57e6-de28-47ef-82ec-b3e9012ec71a`).

### Potential discrepancy to resolve
- `notes/checkpoint-2026-02-06.md` states Vikunja secrets were created in SM (`POSTGRES_PASSWORD`, `VIKUNJA_DATABASE_PASSWORD`, `VIKUNJA_SERVICE_JWTSECRET`).
- `notes/bitwarden-inventory-keys-only.md` (also dated 2026-02-06) lists only 2 keys (`OPENAI_API_KEY`, `OPENCLAW_GATEWAY_TOKEN`).

This may be “inventory captured before creation”, or the create step didn’t persist / was done elsewhere.
**Action:** re-run a keys-only inventory now (no values) to confirm the current truth.

---

## Where imported values may have landed
### A) Bitwarden Vault (most likely)
Indicators:
- Import performed via Bitwarden UI typically targets **Vault items**.
- No additional SM projects/secrets automatically appear after import.

How to confirm (Ted in Bitwarden web app):
1) **Vault** → search for imported items (check *All Items*, folders, and org vault if used).
2) **Secrets Manager** → Projects → `openclaw-prod` → Secrets (verify what actually exists).

### B) Bitwarden Secrets Manager (possible, but less common)
- Only if the import was explicitly an SM import or a scripted creation of SM secrets.
- Confirm via `bws project list` and `bws secret list <projectId>`.

---

## Recommended SM key naming standard (env-var-friendly)
Goal: keys should be directly usable as Linux environment variables (systemd `EnvironmentFile=`, docker compose, etc.).

### Rules
1) **UPPERCASE + digits + underscores only**: `[A-Z0-9_]+`
2) **Prefix with system/app name** to avoid collisions.
3) **Include environment** when you might have multiple envs on the same host or in the same project.
4) Keep names stable; avoid renames unless you also update all consumers.

### Pattern
- Global / already-fixed names (don’t rename):
  - `OPENAI_API_KEY`
  - `OPENCLAW_GATEWAY_TOKEN`

- For services:
  - `<APP>_<ENV>_<COMPONENT>_<NAME>`
  - `<APP>_<ENV>_<NAME>` (if no component needed)

Where:
- `APP` examples: `OPENCLAW`, `MATRIX`, `VIKUNJA`, `POSTGRES`, `CADDY`
- `ENV` examples: `PROD`, `STAGE`, `DEV`
- `COMPONENT` examples: `CONDUIT`, `BOT`, `DB`

### Examples (proposed)
Matrix / Conduit:
- `MATRIX_PROD_SERVER_NAME` (not a secret, but ok to keep for templating)
- `MATRIX_PROD_CONDUIT_REGISTRATION_TOKEN`
- `MATRIX_PROD_BOT_OPENCLAW_USER_ID`
- `MATRIX_PROD_BOT_OPENCLAW_PASSWORD`
- `MATRIX_PROD_BOT_OPENCLAW_DEVICE_ID` (optional)
- `MATRIX_PROD_BOT_OPENCLAW_ACCESS_TOKEN` (optional)

Vikunja:
- `POSTGRES_PROD_PASSWORD` (or keep the existing `POSTGRES_PASSWORD` if already deployed)
- `VIKUNJA_PROD_DATABASE_PASSWORD` (or keep existing `VIKUNJA_DATABASE_PASSWORD`)
- `VIKUNJA_PROD_SERVICE_JWTSECRET` (or keep existing `VIKUNJA_SERVICE_JWTSECRET`)

### Compatibility note (existing docs)
Some existing workspace notes use path-like keys such as `matrix/prod/...`.
Those are **not env-var-friendly**.

Recommendation:
- Prefer the env-var-friendly standard above **for anything that must be exported to processes**.
- If you want hierarchy/grouping in Bitwarden SM, achieve it via:
  - prefixes (`MATRIX_PROD_...`), or
  - separate projects per env (`openclaw-prod`, `openclaw-stage`), or
  - Bitwarden metadata/tags (if available).

---

## Migration / reconciliation checklist (no secret values)

### Phase 0 — safety guardrails
- [ ] Confirm no tooling/scripts print secret values to stdout/stderr/journald.
- [ ] Ensure the Bitwarden SM machine token file exists and is locked down:
  - `~/.config/openclaw/bitwarden-sm.token` perms `0600`.

### Phase 1 — establish current inventory (keys only)
- [ ] `bws project list` (confirm project IDs)
- [ ] `bws secret list <openclaw-prod-project-id>` (capture **keys only** into `notes/bitwarden-inventory-keys-only.md` or a new dated inventory file)
- [ ] In Bitwarden web UI: confirm where the import landed (Vault vs SM).

### Phase 2 — decide what belongs in Secrets Manager
For each imported item (likely Vault):
- [ ] Decide: operational secret vs archive/reference.
- [ ] If operational: identify *consumers* (OpenClaw, Matrix, Vikunja, Caddy, DB, etc.).
- [ ] Normalize into the **standard env-var-friendly key** name.

### Phase 3 — create SM secrets (or map/rename)
- [ ] Create missing SM secrets under the standard key names.
- [ ] If a secret already exists under a nonstandard key:
  - Prefer **add a new key** (standard name) → update consumers → only then consider deleting the old key.
  - Avoid renaming in-place unless you can update every consumer atomically.

### Phase 4 — wire into services (runtime)
- [ ] Ensure each service reads secrets from an `EnvironmentFile` under `/run/...` generated at startup (preferred), or another controlled mechanism.
- [ ] Update docker-compose/systemd units to consume the standard keys.
- [ ] Restart services and verify functionality.

### Phase 5 — reduce duplication / secret sprawl (after verification)
- [ ] Remove plaintext `.env` copies (e.g., `/home/gru/.openclaw/.env`) once SM injection is confirmed.
- [ ] Remove embedded tokens from unit files/configs if SM env injection is authoritative.
- [ ] Consider rotating any credential that might have been copied/printed during past debugging.

### Phase 6 — cleanup (optional, only with explicit approval)
- [ ] Archive or delete unused Vault items created by the import.
- [ ] Archive or delete obsolete SM keys after confirming they are unused.

---

## Concrete “next commands” (keys-only)
(Do not run with debug flags; do not print values.)

```bash
export BWS_ACCESS_TOKEN="$(cat ~/.config/openclaw/bitwarden-sm.token)"
PROJECT_ID="51ba57e6-de28-47ef-82ec-b3e9012ec71a"

# keys-only list
bws secret list "$PROJECT_ID" -o json | jq -r '.[].key' | sort
```

If Vikunja secrets are expected but not present, re-create them (still without printing values) using the established runbook in `notes/bitwarden-setup.md` / `notes/vikunja-secrets.md`.
