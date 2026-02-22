# Vikunja redeploy (Docker Compose + Postgres + Caddy)

Target: **https://tasks.gruted.us.com**

This kit is designed so:
- Compose + config live in **/opt/vikunja**
- Secrets live in Bitwarden Secrets Manager
- A runtime env file is generated into **/run/vikunja/vikunja.env** (tmpfs-ish) and is the *only* secrets file the stack reads.

## Services

- `db` = Postgres 16
- `api` = `vikunja/vikunja` on `:3456` (includes the web frontend since Vikunja 0.23)
- `caddy` = TLS + reverse proxy

Caddy routes:
- `/api/v1/*` → `api:3456`
- everything else → `api:3456`

## Required secrets (Bitwarden SM)

See `notes/vikunja-secrets.md` for the exact key names (keys only, no values).

At minimum:
- `POSTGRES_PASSWORD`

# Add Bitwarden SM keys for Matrix using env-var-friendly names
# Example env keys for Matrix Bitwarden Secrets Manager:
# - MATRIX_CONDUIT_REGISTRATION_TOKEN
# - MATRIX_BOT_PASSWORD
# - MATRIX_BOT_DEVICE_ID

# These can be used in the deploy scripts or config generation for Matrix and Vikunja services.
- `VIKUNJA_DATABASE_PASSWORD` (usually same as POSTGRES_PASSWORD)
- `VIKUNJA_SERVICE_JWTSECRET`

## Runtime env file

The compose file reads secrets from an env file path specified by `VIKUNJA_RUNTIME_ENV_FILE` (see `.env`).

Typical location:

- `/run/vikunja/vikunja.env`

This should be generated at deploy time from Bitwarden Secrets Manager (preferred) using your existing `openclaw-secrets-env` flow, **or** a tiny wrapper script (example below).

Example expected contents (NO quotes):

```bash
POSTGRES_PASSWORD=... # used by postgres container
VIKUNJA_DATABASE_PASSWORD=... # used by vikunja api container
VIKUNJA_SERVICE_JWTSECRET=... # used by vikunja api container

# Optional, but recommended:
VIKUNJA_SERVICE_PUBLICURL=https://tasks.gruted.us.com/
VIKUNJA_SERVICE_ENABLEREGISTRATION=false
```

## Minimal root commands (Ted)

These are written assuming Ubuntu + Docker Engine already installed.

### 1) Create directories and install config

```bash
install -d -m 0755 /opt/vikunja
install -d -m 0755 /run/vikunja

# Put these two files in /opt/vikunja
# - docker-compose.yml
# - Caddyfile
```

### 2) Generate runtime secrets env

Using your standard OpenClaw/Bitwarden flow (preferred):

```bash
# Example (adjust to your actual tool/command):
openclaw-secrets-env \
  --project vikunja \
  --out "$VIKUNJA_RUNTIME_ENV_FILE"

chmod 0600 "$VIKUNJA_RUNTIME_ENV_FILE"
```

If you *don’t* have a generator, here is a minimal pattern:

```bash
umask 077
cat > "$VIKUNJA_RUNTIME_ENV_FILE" <<'EOF'
POSTGRES_PASSWORD=REDACTED
VIKUNJA_DATABASE_PASSWORD=REDACTED
VIKUNJA_SERVICE_JWTSECRET=REDACTED
VIKUNJA_SERVICE_FRONTENDURL=https://tasks.gruted.us.com/
VIKUNJA_SERVICE_ENABLEREGISTRATION=false
EOF
```

### 3) Start / update

```bash
cd /opt/vikunja

docker compose pull

docker compose up -d

docker compose ps
```

### 4) Logs / troubleshooting

```bash
cd /opt/vikunja

docker compose logs -f --tail=200 api

docker compose logs -f --tail=200 caddy
```

## Notes / gotchas

- The `api` service reads secrets from `${VIKUNJA_RUNTIME_ENV_FILE}` (configured in `.env`).
- Make sure DNS for `tasks.gruted.us.com` points to this VPS before first start so Caddy can obtain TLS certs.
- If you previously ran Vikunja with a different database, you’ll need to migrate data separately (not included here).
