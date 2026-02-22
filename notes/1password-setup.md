# 1Password long-term setup for OpenClaw (Ubuntu VPS)

Goal: stop 2FA churn by using a **1Password Service Account** + the **`op` CLI**, with least-privilege access to only the secrets OpenClaw needs.

This document is written so Ted can do the 1Password Admin UI steps, and the VPS can be configured to consume secrets securely without storing the token in the OpenClaw workspace.

> Security note
> - **Do not commit** any 1Password tokens/credentials to git.
> - **Do not store** `OP_SERVICE_ACCOUNT_TOKEN` in the OpenClaw workspace (`~/.openclaw/workspace`).

---

## Current state (verified)

- `op` CLI is installed: `/home/linuxbrew/.linuxbrew/bin/op` (version 2.32.1)
- OpenClaw gateway runs as a **systemd user** service:
  - Unit: `~/.config/systemd/user/openclaw-gateway.service`
  - `openclaw gateway status` shows gateway is running on `127.0.0.1:18632`

---

## 1Password Admin UI checklist (Ted)

In **1Password Admin (Business)**:

1. **Create a dedicated vault** for OpenClaw
   - Name suggestion: `OpenClaw` (or `OpenClaw-Prod` if you want environment separation).
   - Put *only* OpenClaw runtime secrets in this vault.

2. **Create a Service Account**
   - Name suggestion: `openclaw-vps` (include the host/VPS name).
   - Use least privilege:
     - Grant the service account access to **only** the `OpenClaw` vault.
     - Permissions: typically **Read items** only (no item creation/editing unless you explicitly want it).

3. **Generate a Service Account token**
   - Save it somewhere secure temporarily for the VPS bootstrap.
   - Plan a rotation cadence (e.g., quarterly) and document owner.

4. **Create items in the `OpenClaw` vault** for each secret OpenClaw needs
   Recommended pattern: one item per integration, with clear naming.

   Examples (adjust to what you actually use):
   - `OpenAI API Key` (field: `api_key`)
   - `Brave Search API Key` (field: `api_key`)
   - `OpenClaw Gateway Token` (if you use one)
   - `Telegram Bot Token`, `Discord Bot Token`, etc.

   Notes:
   - Prefer **password-type** or **API credential** fields when possible.
   - Use consistent field names (`api_key`, `token`, `secret`) to make automation easy.

5. (Optional but recommended) **Create a dedicated “VPS/Infra” vault**
   - Only if you also want to store SSH keys, deploy keys, etc.
   - Keep runtime secrets and infrastructure credentials separated.

---

## Vault structure + least privilege (recommended)

### Simple (recommended)
- Vault: `OpenClaw`
- Service account: `openclaw-vps`
- Access: read-only to `OpenClaw` vault

### More segmented (only if needed)
- Vaults: `OpenClaw-LLM`, `OpenClaw-Messaging`, `OpenClaw-Infra`
- Same service account, granted only the subset it needs

Tradeoff: more vaults = better isolation, but more admin overhead.

---

## VPS setup: store `OP_SERVICE_ACCOUNT_TOKEN` safely (outside workspace)

### Where to store it

Recommended location on this VPS:

- `~/.config/openclaw/op.env`

Why:
- Outside the OpenClaw workspace
- Works cleanly with **systemd user** services via `EnvironmentFile=`

### Create the env file (NO token in this doc)

1. Create the directory:

```bash
mkdir -p ~/.config/openclaw
```

2. Create `~/.config/openclaw/op.env` with strict permissions:

```bash
umask 077
nano ~/.config/openclaw/op.env
chmod 600 ~/.config/openclaw/op.env
```

3. File contents should be exactly:

```bash
OP_SERVICE_ACCOUNT_TOKEN=***REDACTED***
```

> Keep this file readable only by the `gru` user (or whichever user runs the OpenClaw gateway).

---

## Wire 1Password token into the OpenClaw systemd user service

OpenClaw gateway is a systemd **user** service, so add a drop-in so the token is available to the running process.

> Note: the current `openclaw-gateway.service` may already contain plaintext secrets via `Environment=...`. As part of hardening, migrate those into 1Password (Pattern A below) and remove them from the unit file.

1. Create a systemd drop-in directory:

```bash
mkdir -p ~/.config/systemd/user/openclaw-gateway.service.d
```

2. Create drop-in file:

```bash
nano ~/.config/systemd/user/openclaw-gateway.service.d/10-1password.conf
```

3. Paste:

```ini
[Service]
EnvironmentFile=%h/.config/openclaw/op.env
```

4. Reload + restart:

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway.service
```

5. Verify the environment is loaded (sanity check):

```bash
systemctl --user show openclaw-gateway.service -p Environment | tr ' ' '\n' | grep -E '^OP_SERVICE_ACCOUNT_TOKEN='
```

> If you ever paste command output into chat, **redact the token** first.

---

## Verify `op` works with the service account

With `OP_SERVICE_ACCOUNT_TOKEN` available in your shell (either by sourcing the env file or via systemd), run:

```bash
export OP_SERVICE_ACCOUNT_TOKEN="$(grep '^OP_SERVICE_ACCOUNT_TOKEN=' ~/.config/openclaw/op.env | cut -d= -f2-)"
op whoami
op vault list
```

Expected:
- `op whoami` identifies the service account
- `op vault list` shows (at most) the vault(s) you granted access to

If you see `no account found` or auth errors:
- Token not present in environment
- Token revoked/expired
- Service account not granted to the vault

---

## How OpenClaw should consume secrets from 1Password

Two common patterns:

### Pattern A: Fetch at runtime inside the service (preferred)

Pros: secrets never land on disk in plaintext (other than in process env/memory).

Implementation approach:
- Add a small wrapper script that uses `op read` / `op item get` to export needed env vars, then exec OpenClaw.
- Configure systemd `ExecStart=` to call the wrapper.

Example wrapper (do **not** put secrets in the file; it pulls them from 1Password):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Requires OP_SERVICE_ACCOUNT_TOKEN in env.

export OPENAI_API_KEY="$(op read 'op://OpenClaw/OpenAI API Key/api_key')"
export BRAVE_API_KEY="$(op read 'op://OpenClaw/Brave Search API Key/api_key')"

exec openclaw gateway --port "${OPENCLAW_GATEWAY_PORT:-18632}"
```

Store wrapper outside the workspace as well, e.g. `~/.local/bin/openclaw-with-secrets` and `chmod 700`.

### Pattern B: One-time fetch into a root-owned env file (not recommended)

Pros: simplest.
Cons: secrets persist on disk in plaintext.

If you must do this, prefer:
- root-owned file (`/etc/openclaw/secrets.env`), `chmod 600`
- strict review/rotation policy

---

## Rotation procedure (service account token)

When rotating the service account token:

1. Generate a new token in 1Password Admin
2. Update `~/.config/openclaw/op.env` on the VPS
3. Restart service:

```bash
systemctl --user restart openclaw-gateway.service
```

4. Confirm `op whoami` / a test `op read` succeeds
5. Revoke the old token in Admin UI

---

## Troubleshooting

- `op whoami` → `no account found for filter`
  - Means `op` has no usable auth context (token missing or not recognized)
  - Ensure `OP_SERVICE_ACCOUNT_TOKEN` is set in environment of the command/service

- `op read` → permission denied / not found
  - Check vault access grants for the service account
  - Ensure the item name + field path match exactly

- systemd service doesn’t see the token
  - `systemctl --user show openclaw-gateway.service -p Environment`
  - Confirm the drop-in is loaded and points at the right file

---

## Implementation TODOs (next steps)

- Decide which exact secrets OpenClaw needs on this VPS and create corresponding items in 1Password.
- Choose consumption pattern:
  - **A (preferred):** wrapper that fetches secrets from `op://...` then execs OpenClaw
  - **B:** env file with plaintext secrets (avoid)
- If using Pattern A, update the `openclaw-gateway.service` `ExecStart` to run the wrapper.
