# Bitwarden Cloud + Bitwarden Secrets Manager setup for OpenClaw (Ubuntu VPS)

Audience: Ted (admin/operator)

Goal: Store OpenClaw secrets in Bitwarden Secrets Manager (cloud), and have the VPS fetch them at runtime (no secrets committed to repo/workspace).

---

## 0) Decisions to make up front (2 minutes)

- **Bitwarden region**: US vs EU (choose per compliance/latency). You’ll create the account/org in that region.
- **OpenClaw runtime user** on the VPS: recommended a dedicated non-root user (e.g. `openclaw`).
- **Secret delivery model**:
  - **Recommended**: fetch secrets on service start into a runtime-only environment file under `/run/user/<uid>/…` and keep a long-lived machine account token stored in `~/.config/openclaw/…` (permissions 0600).
  - **Avoid**: putting API tokens in repo, `.env` in workspace, or systemd unit files.

---

## 1) Bitwarden Cloud account setup

1. Create a Bitwarden account (cloud) at https://bitwarden.com/ (or EU portal if applicable).
2. Enable **2FA** on the account (Authenticator app recommended).
3. Install Bitwarden app/browser extension for convenience (optional).

Verification:
- Confirm you can log in and that 2FA is enforced.

Rollback:
- If you created the account in the wrong region, stop and recreate in the correct region (organizations/projects don’t migrate cleanly).

---

## 2) Create an Organization (required for Secrets Manager)

1. In the Bitwarden Web Vault → **Organizations** → **New organization**.
2. Name it something like: `Ted OpenClaw` or `OpenClaw`.
3. Choose a plan that supports **Secrets Manager** (trial or paid).
4. Add any additional admins as organization owners (optional).

Verification:
- You can see the org in the left sidebar and access org settings.

Rollback:
- Delete the organization (Org Settings → Danger Zone) if you want to restart naming/plan. Ensure no production secrets depend on it.

---

## 3) Enable Bitwarden Secrets Manager

1. In the Organization → **Secrets Manager**.
2. If prompted, activate it for the org / start trial.

Verification:
- “Secrets Manager” menu appears and lets you create Projects/Secrets.

---

## 4) Create Projects (one per environment)

Recommended project layout:
- `openclaw-prod` (your VPS)
- (optional) `openclaw-dev` (local/dev)

Steps:
1. Org → Secrets Manager → **Projects** → **New project**.
2. Create `openclaw-prod`.

Verification:
- Project exists; you can open it and manage Secrets/Machine Accounts.

Rollback:
- Delete the project if created incorrectly (after removing secrets and machine accounts).

---

## 5) Define secret naming + fields (convention)

### 5.1 Naming convention

Use names that map 1:1 to environment variables OpenClaw expects.

- Prefer uppercase with underscores (env-var style): `OPENAI_API_KEY`, `OPENCLAW_GATEWAY_TOKEN`, etc.
- Keep provider prefixes consistent: `OPENAI_…`, `DISCORD_…`, `TELEGRAM_…`.
- Avoid embedding environment in the name if you use separate projects (prod/dev).

### 5.2 Secret “notes” / metadata

In Bitwarden Secrets Manager, each secret can store a value (string) plus description/notes.

Recommended to record:
- What it is used for
- Where it is used (service/component)
- Rotation frequency
- Owner

### 5.3 Suggested baseline secrets for OpenClaw

Adjust to match your OpenClaw configuration.

Core:
- `OPENCLAW_ENV` = `prod`
- `OPENCLAW_LOG_LEVEL` = `info` (or `debug` during initial setup)

If using OpenAI:
- `OPENAI_API_KEY` = `…`

If using OpenClaw Gateway (example placeholders):
- `OPENCLAW_GATEWAY_URL` = `https://…` (if applicable)
- `OPENCLAW_GATEWAY_TOKEN` = `…`

If using Discord plugin:
- `DISCORD_BOT_TOKEN` = `…`

If using Telegram:
- `TELEGRAM_BOT_TOKEN` = `…`

If using any SMTP/email:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Verification:
- Each secret exists in the correct project and values are set.

Rollback:
- Delete secrets or rotate them if accidentally pasted into the wrong project.

---

## 6) Create a Machine Account (non-human runtime identity)

Machine Accounts are the right way for servers to fetch secrets.

Steps:
1. Org → Secrets Manager → Project `openclaw-prod` → **Machine Accounts** → **New machine account**.
2. Name: `openclaw-vps-<hostname>`.
3. Grant it access only to the `openclaw-prod` project.
4. Least privilege: only the secrets needed for the VPS.

Create an access token for the machine account:
1. Open the machine account → **Access tokens** → **New access token**.
2. Copy the token once and store it securely.

Important:
- Treat the machine token like a root credential. Anyone with it can read secrets it has access to.

Verification:
- Token is created and displayed once; you stored it.

Rollback:
- Revoke/delete the access token if it’s exposed.
- Delete the machine account and recreate if access was mis-scoped.

---

## 7) Minimal bootstrap artifact (what you keep on the VPS)

You only need:

- **Bitwarden Secrets Manager machine token** (long-lived) stored on disk with strict permissions.
- A small wrapper that fetches secrets at startup and writes an environment file in a runtime directory.
- A systemd unit drop-in to load that environment file.

Do **not** store any other secret values on disk if you can avoid it.

---

# VPS-side setup plan (Ubuntu)

Assumptions:
- VPS user account: `openclaw` (adjust if different)
- OpenClaw runs as a **user service**: `systemctl --user …`
- Workspace is at: `/home/openclaw/.openclaw/workspace`

## A) Install prerequisites

```bash
sudo apt-get update
sudo apt-get install -y curl jq
```

### Install Bitwarden Secrets Manager CLI (recommended)

Bitwarden provides a dedicated Secrets Manager CLI (often called `bws`). Install method can vary by distro/version.

Preferred approach:
- Follow Bitwarden docs for **Secrets Manager CLI** for Linux.
- Ensure binary ends up on PATH for the `openclaw` user, e.g. `/usr/local/bin/bws`.

Alternative (not preferred for SM-only use): Bitwarden Vault CLI `bw`.

Verification:

```bash
bws --version
# or
bw --version
```

Rollback:
- Remove the binary from `/usr/local/bin` (or uninstall package) if you need to revert.

## B) Store the machine token (outside repo/workspace)

As user `openclaw`:

```bash
install -d -m 700 ~/.config/openclaw
umask 077
cat > ~/.config/openclaw/bitwarden-sm.token <<'EOF'
PASTE_MACHINE_ACCESS_TOKEN_HERE
EOF
chmod 600 ~/.config/openclaw/bitwarden-sm.token
```

Notes:
- Keep this file **out of** `/home/openclaw/.openclaw/workspace`.
- Back it up in your password manager, not in git.

Verification:

```bash
stat -c '%a %n' ~/.config/openclaw/bitwarden-sm.token
# expect: 600
```

Rollback:
- Revoke the token in Bitwarden first, then delete the file.

## C) Create a runtime-only env file directory

Use `/run/user/<uid>/openclaw/` which is tmpfs-like and cleared on reboot.

```bash
install -d -m 700 /run/user/$(id -u)/openclaw
```

(You’ll typically create this in the wrapper on each start, because `/run/user/<uid>` may not exist until the user session is active.)

## D) Wrapper script: fetch secrets and write an env file at startup

Create `~/.local/bin/openclaw-secrets-env`:

```bash
install -d -m 700 ~/.local/bin
cat > ~/.local/bin/openclaw-secrets-env <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
umask 077

TOKEN_FILE="${HOME}/.config/openclaw/bitwarden-sm.token"
OUT_DIR="/run/user/$(id -u)/openclaw"
OUT_FILE="${OUT_DIR}/secrets.env"

if [[ ! -f "${TOKEN_FILE}" ]]; then
  echo "Missing token file: ${TOKEN_FILE}" >&2
  exit 1
fi

if ! command -v bws >/dev/null 2>&1; then
  echo "bws CLI not found on PATH" >&2
  exit 1
fi

install -d -m 700 "${OUT_DIR}"

PROJECT_ID="${OPENCLAW_BWS_PROJECT_ID:-}"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "Set OPENCLAW_BWS_PROJECT_ID (systemd Environment=) to your Bitwarden project id" >&2
  exit 1
fi

TMP_OUT="$(mktemp "${OUT_DIR}/secrets.env.XXXXXX")"
TMP_ERR="$(mktemp "${OUT_DIR}/bws.stderr.XXXXXX")"
chmod 600 "${TMP_OUT}" "${TMP_ERR}"

cleanup() {
  rm -f "${TMP_OUT}" "${TMP_ERR}"
}
trap cleanup EXIT

# IMPORTANT SAFETY NOTES:
# - Never emit secret values to stdout/stderr (journald captures them).
# - Avoid `bws ... --output table` (it prints values).
# - Prefer `--output env` written straight to a root/owner-only file.
# - Also avoid passing the access token as a CLI arg if possible (it can show up in `ps`).

# Most bws versions support reading the token from an env var (commonly BWS_ACCESS_TOKEN).
# If yours requires `--access-token`, use it as a last resort and understand the `ps` exposure.
if ! env BWS_ACCESS_TOKEN="$(<"${TOKEN_FILE}")" \
  bws secrets list --project-id "${PROJECT_ID}" --output env \
  >"${TMP_OUT}" 2>"${TMP_ERR}"; then
  echo "bws failed to fetch secrets (stderr captured to ${TMP_ERR})" >&2
  exit 1
fi

# Basic sanity check: ensure it looks like KEY=... lines (don’t print values)
if ! grep -qE '^[A-Za-z_][A-Za-z0-9_]*=' "${TMP_OUT}"; then
  echo "bws output did not look like env format; refusing to write ${OUT_FILE}" >&2
  exit 1
fi

# Atomic replace into a stable path
mv -f "${TMP_OUT}" "${OUT_FILE}"
chmod 600 "${OUT_FILE}"

# Cleanup stderr capture on success
rm -f "${TMP_ERR}"
trap - EXIT

# Optional: list loaded keys only (safe)
cut -d= -f1 "${OUT_FILE}" | sed 's/^/loaded: /' >&2
EOF
chmod 700 ~/.local/bin/openclaw-secrets-env
```

Notes:
- This wrapper **never prints secret values**. It writes `bws --output env` straight to a temp file in `/run/user/<uid>/openclaw/` and then atomically renames it.
- Avoid `bws ... --output table` (or anything that renders a table) because it prints values to your terminal/journald.
- Prefer providing the machine access token via an environment variable (e.g. `BWS_ACCESS_TOKEN`) rather than a CLI flag, to reduce exposure in `ps`/process-argument logs.

Verification:

```bash
export OPENCLAW_BWS_PROJECT_ID="<your-project-id>"
~/.local/bin/openclaw-secrets-env
ls -l /run/user/$(id -u)/openclaw/secrets.env
head -n 5 /run/user/$(id -u)/openclaw/secrets.env | cut -d= -f1
```

Rollback:
- Remove the script; revoke token.

## E) systemd user service drop-in to load secrets env

Find your OpenClaw user service name (examples):
- `openclaw.service`
- `openclaw-gateway.service`

List user units:

```bash
systemctl --user list-unit-files | grep -i openclaw
```

Create a drop-in directory (example for `openclaw.service`):

```bash
systemctl --user edit openclaw.service
```

Paste:

```ini
[Service]
# 1) Fetch secrets before starting
ExecStartPre=%h/.local/bin/openclaw-secrets-env

# 2) Load the generated env file
EnvironmentFile=/run/user/%U/openclaw/secrets.env

# 3) Provide the project id (non-secret)
Environment=OPENCLAW_BWS_PROJECT_ID=<your-project-id>
```

Reload + restart:

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
systemctl --user status openclaw.service --no-pager
```

Verification:
- Service starts cleanly.
- App logs show it can authenticate to providers (OpenAI/Discord/etc).

Rollback:

```bash
systemctl --user revert openclaw.service
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

Then:
- Revoke the machine token in Bitwarden.
- Remove `~/.config/openclaw/bitwarden-sm.token`.

---

# Verification checklist (end-to-end)

Bitwarden side:
- [ ] Organization exists and you are Owner
- [ ] Secrets Manager enabled
- [ ] Project `openclaw-prod` created
- [ ] Secrets created with correct names/values
- [ ] Machine account created with access only to `openclaw-prod`
- [ ] Access token created and stored securely

VPS side:
- [ ] `bws` CLI installed and works
- [ ] Token stored at `~/.config/openclaw/bitwarden-sm.token` (0600)
- [ ] Wrapper `~/.local/bin/openclaw-secrets-env` runs successfully
- [ ] `/run/user/<uid>/openclaw/secrets.env` created (0600)
- [ ] systemd drop-in loads env file and service starts

Operational:
- [ ] Rotate one secret in Bitwarden and restart service → change takes effect
- [ ] Revoke machine token → restart should fail to fetch secrets (expected)

---

# Common pitfalls

- **Wrong project id / wrong machine account scope** → wrapper fails or returns empty list.
- **Multiline secrets** (private keys, JSON) → `EnvironmentFile` parsing breaks. Prefer single-line tokens, or store base64 and decode inside the app.
- **Leaking secrets in logs** → never `set -x`, never print values; ensure `bws` output is redirected to a file (not the journal).
- **Decrypted env files left behind** (especially under `/tmp` or the repo/workspace) → treat as a secret leak; delete securely and rotate exposed secrets.
- **Token accidentally committed** → rotate/revoke immediately.

## Cleanup if you accidentally exported secrets to disk

If you ever ran something like `bws ... --output env > /tmp/bws.env` (or copied secrets into a workspace `.env`), treat that as an exposure.

Suggested cleanup steps:

```bash
# Find obvious env exports under /tmp
find /tmp -maxdepth 2 -type f -name '*.env' -print

# Secure-delete (best effort) any accidental plaintext env files
# (If `shred` isn’t available or filesystem doesn’t support it, fall back to rm)
shred -u /tmp/suspect.env 2>/dev/null || rm -f /tmp/suspect.env
```

Then rotate any secrets that may have been exposed and clear shell history if you pasted secrets at a prompt.

---

# Notes / TODO for final wiring

- Confirm the exact `bws` CLI syntax for exporting `--output env` for a given project (and which env var name it uses for the access token, e.g. `BWS_ACCESS_TOKEN`).
- Confirm OpenClaw’s exact service name and which env vars it reads.
- If OpenClaw runs as a **system service** (not user service), adapt paths to `/etc/openclaw/` + `/run/openclaw/` and use root-owned permissions.
