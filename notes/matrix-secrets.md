# Matrix (Conduit) — Bitwarden Secrets Manager keys (names only)

This file lists **secret keys to store** (no values). Use a consistent naming scheme (e.g., project `matrix`, environment `prod`).

## Preferred (env-var-friendly keys)

These are duplicates created specifically so tooling that expects **environment variable names** can consume them (no `/` characters).

- `MATRIX_CONDUIT_REGISTRATION_TOKEN` (dup of `matrix/prod/conduit_registration_token`)
- `MATRIX_BOT_PASSWORD` (dup of `matrix/prod/bot_openclaw_password`)
- `MATRIX_BOT_DEVICE_ID` (dup of `matrix/prod/bot_openclaw_device_id`)

## Required

- `matrix/prod/conduit_server_name`
  - Value: `matrix.gruted.us.com`
  - Note: This is not sensitive, but keeping it in SM helps templating.

## Recommended (bootstrap / admin)

Conduit’s registration/admin mechanisms vary by version; the safest bootstrap is **token-gated registration** for the initial admin.

- `matrix/prod/conduit_registration_token`
  - Used if you enable `allow_registration = true` with `registration_token = "..."` during bootstrap.
  - After admin is created: disable registration again.

## Bot / automation user (for OpenClaw + other bots)

Create a dedicated bot user (example): `@gru:matrix.gruted.us.com`

- `matrix/prod/bot_openclaw_user_id`
  - e.g. `@gru:matrix.gruted.us.com`
- `matrix/prod/bot_openclaw_password`
- `matrix/prod/bot_openclaw_device_id`
  - Optional; helpful to pin a device for E2EE/cross-signing.
- `matrix/prod/bot_openclaw_access_token`
  - Prefer storing the access token after first login.

If you plan to enable end-to-end encryption in rooms the bot participates in:
- `matrix/prod/bot_openclaw_megolm_backup_key` (or equivalent)
- `matrix/prod/bot_openclaw_cross_signing_recovery_key`

(Exact key material depends on the SDK/client used by OpenClaw. If OpenClaw runs as a simple Matrix client without E2EE support, prefer keeping OpenClaw in non-encrypted rooms.)

## Signing key / identity backup procedure (critical)

Matrix federation identity is tied to the homeserver signing keys.

Conduit stores signing keys inside its persistent data directory/volume.

Store a backup artifact + metadata:

- `matrix/prod/conduit_data_backup_location`
  - e.g. `bw://secure-file/....` or offsite backup URI
- `matrix/prod/conduit_data_backup_last_verified_utc`

Operational procedure (no secrets here):
1) Stop Conduit briefly.
2) Create a tar.gz backup of the Conduit data volume.
3) Store securely (Bitwarden secure file + offline copy).
4) Record the timestamp and verify you can list/extract it.

## Caddy / TLS

No secrets are required if you use ACME HTTP-01 on ports 80/443 and public DNS A/AAAA records.

If you later switch to DNS-01:
- `matrix/prod/caddy_dns_api_token` (provider-specific)
