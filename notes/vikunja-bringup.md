# Vikunja bring-up (tasks.gruted.us.com) — Docker Compose + Bitwarden SM + host Caddy

Host: srv1325560 (Ubuntu)

Architecture (current):
- Vikunja runs in Docker and publishes **loopback only**: `127.0.0.1:3456`
- A **single host-level Caddy** (systemd) terminates TLS and serves BOTH:
  - `matrix.gruted.us.com` (Conduit)
  - `tasks.gruted.us.com` (Vikunja)

This avoids port conflicts from running multiple reverse proxies on :80/:443.

This setup is designed to work with current sudoers constraints (NOPASSWD only for apt/apt-get/docker/systemctl/journalctl/ufw).
**No sudo is needed to create runtime directories or copy secret env files.**

## Layout

- Compose dir: `~/.openclaw/workspace/deploy/vikunja/`
- Runtime env file (tmpfs): `/run/user/$(id -u)/vikunja/vikunja.env`
- Env generator: `~/.local/bin/vikunja-secrets-env`
- Bitwarden Secrets Manager project: `openclaw-prod` (`51ba57e6-de28-47ef-82ec-b3e9012ec71a`)

The compose stack uses the merged image `vikunja/vikunja:latest` (Vikunja serves API + frontend from one container).

## Bitwarden Secrets Manager keys required

These are expected to exist in the Bitwarden SM project (keys only; values not shown):

- `POSTGRES_PASSWORD`
- `VIKUNJA_DATABASE_PASSWORD`
- `VIKUNJA_SERVICE_JWTSECRET`

Optional keys are supported by the generator script but not required.

## 0) One-time prerequisites (Docker)

```bash
sudo -n /usr/bin/apt-get update
sudo -n /usr/bin/apt-get install -y docker.io docker-compose-v2
sudo -n /usr/bin/systemctl enable --now docker
```

Verify:

```bash
sudo -n /usr/bin/docker --version
sudo -n /usr/bin/docker compose version
sudo -n /usr/bin/systemctl is-active docker
```

## 1) Generate the runtime env file (secrets)

This pulls the required secret keys from Bitwarden SM and writes them to a root-readable, user-owned runtime file with `0600` perms.

```bash
export VIKUNJA_BWS_PROJECT_ID="51ba57e6-de28-47ef-82ec-b3e9012ec71a"
~/.local/bin/vikunja-secrets-env

# Verify file exists (do NOT cat it)
ls -l /run/user/$(id -u)/vikunja/vikunja.env
```

Notes:
- The Bitwarden machine token is expected at: `~/.config/openclaw/bitwarden-sm.token` (0600).
- The script prints **keys only** (`loaded: ...`) to stderr; it never prints values.

## 2) Start (or restart) the stack

```bash
cd ~/.openclaw/workspace/deploy/vikunja
sudo -n /usr/bin/docker compose up -d
```

Check status/logs:

```bash
sudo -n /usr/bin/docker compose ps
sudo -n /usr/bin/docker compose logs --tail=200
```

## 3) Firewall (only if needed)

This VPS currently has `ufw` inactive, but if you enable it later:

```bash
sudo -n /usr/sbin/ufw allow 80/tcp
sudo -n /usr/sbin/ufw allow 443/tcp
sudo -n /usr/sbin/ufw status verbose
```

## 4) Verify (local + public)

```bash
# Local (loopback) — Vikunja directly (no TLS)
curl -fsSI http://127.0.0.1:3456/ | head
curl -fsS  http://127.0.0.1:3456/api/v1/info | head

# Public domain (TLS terminated by host Caddy)
curl -4fsSI https://tasks.gruted.us.com/ | head
curl -4fsS  https://tasks.gruted.us.com/api/v1/info | head
```

Expected:
- `https://tasks.gruted.us.com/` returns `200` and serves the UI.
- `/api/v1/info` returns JSON including version and `frontend_url`.

## Common ops

### Update images

```bash
cd ~/.openclaw/workspace/deploy/vikunja
sudo -n /usr/bin/docker compose pull
sudo -n /usr/bin/docker compose up -d
```

### Regenerate secrets + restart (after rotating in Bitwarden)

```bash
export VIKUNJA_BWS_PROJECT_ID="51ba57e6-de28-47ef-82ec-b3e9012ec71a"
~/.local/bin/vikunja-secrets-env

cd ~/.openclaw/workspace/deploy/vikunja
sudo -n /usr/bin/docker compose up -d
```

### Stop

```bash
cd ~/.openclaw/workspace/deploy/vikunja
sudo -n /usr/bin/docker compose down
```

### Full reset (DANGEROUS: deletes DB + files volumes)

```bash
cd ~/.openclaw/workspace/deploy/vikunja
sudo -n /usr/bin/docker compose down -v
```
