# Bitwarden Secrets Manager inventory (keys only) — openclaw-prod

- **When:** 2026-02-06 (UTC)
- **Project:** `openclaw-prod`
- **Project ID:** `51ba57e6-de28-47ef-82ec-b3e9012ec71a`
- **Method:** `bws secret list <project_id>` using machine/service-account access token from `~/.config/openclaw/bitwarden-sm.token`
- **Values:** **NOT displayed** (keys only)

## Machine token permission check

Commands executed (values not shown):

- `bws project list` ✅ (token can list projects)
- `bws secret list 51ba57e6-de28-47ef-82ec-b3e9012ec71a` ✅ (token can list secrets in this project)

## Keys currently present in this project

Total: **2**

### Required now (OpenClaw)

- `OPENAI_API_KEY`
- `OPENCLAW_GATEWAY_TOKEN`

### Required next (Matrix, Vikunja)

None present yet (expected to be added later).

### Extras / noise

None detected.

## Notes / recommended cleanup plan (non-destructive)

- No immediate cleanup needed; the project is minimal and contains only the two expected OpenClaw secrets.
- If/when Matrix and Vikunja are introduced, prefer adding their credentials as **new keys** in this project (or a separate project per environment) and keep naming consistent (e.g., `MATRIX_*`, `VIKUNJA_*`).
- If additional unrelated secrets appear in the future:
  - **Move** them to a more appropriate project (preferred over deleting).
  - **Delete** only with explicit approval, after confirming they are unused.
