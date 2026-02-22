# Reset Checkpoint — 2026-02-07

## What a /reset affects
- A /reset in the **main session** resets *our* conversational context window.
- It does **not inherently stop** already-running sub-agent sessions; they continue until completion/timeout unless explicitly cancelled.
- After a reset, sub-agents won’t automatically gain the new main-session context unless we message them; so the safe pattern is to keep the next-steps/state in artifacts like this file + `STATE.md`/`TASKS.md`.

## Current reality check
- OpenClaw gateway is running (systemd service healthy).
- Matrix homeserver (Conduit + host Caddy) is up and endpoints work.
- OpenClaw Matrix channel is configured in `~/.openclaw/openclaw.json` with:
  - homeserver `https://matrix.gruted.us.com`
  - userId `@gru:matrix.gruted.us.com`
  - room `!xpv47hNiIQOwLAHNpK_A_oIdYanxcu4DonLuajyAXwY`
- **But outbound Matrix sending is currently broken** because runtime credentials for the bot are missing:
  - no `MATRIX_ACCESS_TOKEN` or `MATRIX_PASSWORD` available to the gateway at runtime
  - message tool errors: `Matrix password is required when no access token is configured (matrix.password)`

## Why Ted received nothing while away
- The gateway couldn’t authenticate as the bot, so it could not send DMs/room messages.

## Outstanding work (high priority)
1) **Fix Matrix outbound auth end-to-end** (no user involvement expected)
   - Acquire bot credential (prefer access token; fallback password-login).
   - Store credential in Bitwarden Secrets Manager under env-var-friendly key(s).
   - Update `openclaw-secrets-env` to export Matrix keys (at minimum: `MATRIX_ACCESS_TOKEN` OR `MATRIX_PASSWORD`, plus `MATRIX_HOMESERVER`/`MATRIX_USER_ID` if needed).
   - Restart `openclaw-gateway` and send a test message to the configured room / DM Ted.

2) **Matrix Caddy `/` handler ordering**
   - Template updated in `deploy/matrix/Caddyfile`, but host `/etc/caddy/Caddyfile` may still need the fix + reload.
   - Requires root-level reload of Caddy.

3) **Bitwarden import reconcile (Vault vs SM) + env-var key standardization**
   - Confirm what the Bitwarden UI “import” actually created (Vault items vs SM secrets).
   - Migrate required values into SM using env-var-friendly keys (avoid path-like keys for env export).

## Parallel sub-agent plan (run concurrently)
- Sub-agent A: Matrix outbound fix + test send.
- Sub-agent B: Bitwarden reconcile + env-key mapping (keys-only; no secrets printed).
- Sub-agent C: Model/cost policy doc.
- Sub-agent D: Post-cutover security audit checklist (non-destructive; propose changes, don’t apply without confirmation).

## Definition of done for the Matrix fix
- A test message sent from `@gru:matrix.gruted.us.com` is received by Ted (DM or the configured room).
- Restart is stable and secrets are only sourced from runtime env files (no plaintext tokens in repo/workspace).

## If returning after reset
- Read: `STATE.md`, `TASKS.md`, and this file.
- First action: check Matrix outbound by sending a single test message and verifying receipt.
