# OpenClaw ↔ Matrix (post-homeserver bring-up)

Once the homeserver is reachable, configure OpenClaw’s Matrix channel plugin.

## Connection parameters (logical)

You will generally need:
- Homeserver base URL: `https://matrix.gruted.us.com`
- Bot user id (MXID): `@gru:matrix.gruted.us.com`
- Bot access token (**preferred**) OR password (for login-based token retrieval)
- Target room id(s) the bot should join/post to (e.g. `!…`)

Store secrets in Bitwarden Secrets Manager (see `notes/matrix-secrets.md`).

## How OpenClaw actually reads Matrix credentials (this build)

The bundled Matrix plugin resolves credentials in this precedence order:
1) `~/.openclaw/openclaw.json` → `channels.matrix.*`
2) environment variables:
   - `MATRIX_HOMESERVER`
   - `MATRIX_USER_ID`
   - `MATRIX_ACCESS_TOKEN` (preferred)
   - `MATRIX_PASSWORD` (fallback)
   - `MATRIX_DEVICE_NAME` (optional)

On this VPS, the `openclaw-gateway.service` is already wired to load a runtime-only EnvironmentFile generated from Bitwarden SM via `openclaw-secrets-env`.

## Suggested rollout

1) Create bot account (token-gated registration during bootstrap is safest).
2) Log in once (Element or a CLI) to obtain and store the bot’s access token.
3) Create a dedicated room for OpenClaw, invite the bot, and note the room **ID** (not just the alias).
4) Configure OpenClaw Matrix plugin with:
   - `homeserver=https://matrix.gruted.us.com`
   - `userId=@gru:matrix.gruted.us.com`
   - `accessToken=…` (prefer env/Bitwarden)
   - `roomId=!…`

## E2EE recommendation

Unless you have confirmed the OpenClaw Matrix integration supports E2EE end-to-end (including key storage/backup), keep the OpenClaw room **unencrypted**.
If you later enable E2EE, you’ll need a strategy for key backup/cross-signing for the bot account.
