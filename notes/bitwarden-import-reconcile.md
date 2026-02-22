# Bitwarden import reconcile + Secrets Manager setup (openclaw-prod)

When: 2026-02-06 (UTC)

## 1) Where did Ted’s import land?

### What we can see with `bws`

`bws` is the **Bitwarden Secrets Manager CLI**. It can only access:

- **Projects**
- **Secrets** inside those projects

It **cannot** list or search Bitwarden **Vault items** (Logins/Secure Notes/Cards/Identity) that may have been imported into a personal or organization vault.

Evidence:

- `bws --help` only exposes `project` and `secret` subcommands.
- `bws project list` shows **exactly one project**: `openclaw-prod`.
- New/extra imported material does **not** appear as additional Secrets Manager projects.

### Conclusion

If Ted performed an “import” in Bitwarden and expected it to appear in Secrets Manager, it likely landed in the **Bitwarden Vault** (items), not in **Secrets Manager**.

### Next steps Ted can do in the Bitwarden UI (to confirm)

1) Open the Bitwarden web app.
2) Check both:
   - **Vault** → search for imported items (look at *All Items* / folders / the organization vault if applicable)
   - **Secrets Manager** → **Projects** → open `openclaw-prod` and review **Secrets**
3) If the import is in Vault items:
   - Decide which values should become **Secrets Manager secrets**.
   - Manually create Secrets Manager entries for those values (or export/transform and re-import into SM using SM-native workflows).

Notes:
- Vault items and Secrets Manager secrets are **different products/data models**. Imports commonly target the Vault.

## 2) Secrets created in Secrets Manager project `openclaw-prod`

Project:
- Name: `openclaw-prod`
- ID: `51ba57e6-de28-47ef-82ec-b3e9012ec71a`

### Vikunja (created)

Created the following Secrets Manager secrets **with freshly generated strong random values** (values not printed):

- `POSTGRES_PASSWORD`
- `VIKUNJA_DATABASE_PASSWORD` (set equal to `POSTGRES_PASSWORD`)
- `VIKUNJA_SERVICE_JWTSECRET`

These correspond to `deploy/vikunja/README.md` and `notes/vikunja-secrets.md`.

### Matrix (not created — missing required specifics)

Matrix secrets were **not** created automatically because the required set and values depend on the chosen Matrix deployment approach:

- Homeserver URL, bot user ID, room IDs are **environment-specific** (not safely guessable).
- If using access tokens/device IDs, those are **issued by Matrix**, not random.

#### Recommended Matrix secret keys (proposed)

Once Ted confirms the intended Matrix setup, create secrets such as:

- `MATRIX_HOMESERVER_URL` (e.g. `https://matrix.example.com`)
- `MATRIX_BOT_USER_ID` (e.g. `@openclaw:example.com`)
- `MATRIX_BOT_PASSWORD` (random strong password **if** you will login with password)
- `MATRIX_ACCESS_TOKEN` + `MATRIX_DEVICE_ID` (if using a pre-provisioned token)
- optional policy/config (non-secret but sensitive): allowlists, default room, etc.

## 3) Proposed cleanup actions (no deletions performed)

- If Ted’s import created a large number of **Vault items** that are actually operational secrets, consider:
  - copying only the **needed** values into Secrets Manager under consistent keys, then
  - keeping Vault items as an archive or deleting them **only after** confirming nothing depends on them.

- If any secrets were ever exposed in logs/terminal output during investigation, rotate the affected credentials (OpenAI key, gateway token, etc.) as appropriate.
