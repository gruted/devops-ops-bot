# Matrix bring-up (Conduit + host Caddy) — srv1325560

## Overview
- Homeserver name: `matrix.gruted.us.com`
- Conduit runs in Docker and binds **loopback only**: `127.0.0.1:8008`
- A single **host-level Caddy** terminates TLS and serves BOTH:
  - `matrix.gruted.us.com` → proxies to `127.0.0.1:8008`
  - `tasks.gruted.us.com` → proxies to `127.0.0.1:3456`
- Matrix routing includes:
  - `https://matrix.gruted.us.com` (client-server API)
  - `https://matrix.gruted.us.com:8448` (federation)

## Bitwarden Secrets Manager (keys only)
Project: `openclaw-prod` (`51ba57e6-de28-47ef-82ec-b3e9012ec71a`)

Preferred (env-var-friendly) keys:
- `MATRIX_CONDUIT_REGISTRATION_TOKEN` (dup of `matrix/prod/conduit_registration_token`)
- `MATRIX_BOT_PASSWORD` (dup of `matrix/prod/bot_openclaw_password`)
- `MATRIX_BOT_DEVICE_ID` (dup of `matrix/prod/bot_openclaw_device_id`)

Legacy path-like keys (still present; avoid in new tooling):
- `matrix/prod/conduit_registration_token`
- `matrix/prod/bot_openclaw_user_id`
- `matrix/prod/bot_openclaw_password`
- `matrix/prod/bot_openclaw_device_id`


Preferred env-var keys (duplication of legacy):
- `MATRIX_CONDUIT_REGISTRATION_TOKEN`
- `MATRIX_BOT_PASSWORD`
- `MATRIX_BOT_DEVICE_ID`

Optional (if present, overrides default):
- `matrix/prod/conduit_server_name` (else defaults to `matrix.gruted.us.com`)

## Files / locations
- Deploy kit (non-secret):
  - `/home/gru/.openclaw/workspace/deploy/matrix/`
- Runtime generated (contains secrets; **not committed**):
  - `/run/user/1001/matrix/matrix.env`
  - `/run/user/1001/matrix/conduit.rendered.toml`
- Conduit persistent data volume (**back up**; includes signing keys):
  - Docker volume: `conduit_data`

## Prereqs (root)
Installed via:
- `sudo apt-get update`
- `sudo apt-get install -y caddy`

Note: host Caddy needs ports **80/443/8448**. If another container binds 80/443 (e.g. a dockerized Caddy), it must be stopped or moved.

## Generate Conduit config (no secrets printed)
Script:
- `~/.local/bin/matrix-secrets-env`

Generate config with registration disabled (recommended default):
```bash
MATRIX_BWS_PROJECT_ID=51ba57e6-de28-47ef-82ec-b3e9012ec71a \
  ~/.local/bin/matrix-secrets-env
```

To temporarily enable token-gated registration (for onboarding):
```bash
MATRIX_BWS_PROJECT_ID=51ba57e6-de28-47ef-82ec-b3e9012ec71a \
  ~/.local/bin/matrix-secrets-env --enable-registration
```

## Start / restart Conduit
```bash
cd /home/gru/.openclaw/workspace/deploy/matrix
sudo docker compose up -d
sudo docker compose restart conduit
sudo docker logs --tail=200 conduit
```

## Configure host Caddy
Template used:
- `/home/gru/.openclaw/workspace/deploy/matrix/Caddyfile`

Note: Caddy's `respond` directive syntax is `respond <matcher> <body> <status>`. If you put the status before the body (e.g. `respond / 200 "..."`), Caddy logs a `static response parse error` and `/` returns HTTP 500.

Current template also adds a basic upstream health check:
- `health_uri /_matrix/client/versions`

Deployed to:
- `/etc/caddy/Caddyfile`

### Add `tasks.gruted.us.com` to the SAME host Caddyfile
Ensure `/etc/caddy/Caddyfile` includes an additional site block like:

```caddy
# Vikunja (tasks)
tasks.gruted.us.com {
  encode zstd gzip

  reverse_proxy 127.0.0.1:3456
}
```

Notes:
- This assumes the Vikunja container publishes `127.0.0.1:3456:3456` (see `deploy/vikunja/docker-compose.yml`).
- If you want stricter routing, you can add `health_uri /api/v1/info` to the reverse_proxy.

Because sudoers is restricted, this was written using a one-shot root container:
```bash
sudo docker run --rm \
  -v /home/gru/.openclaw/workspace/deploy/matrix/Caddyfile:/src:ro \
  -v /etc/caddy:/etc/caddy \
  alpine:3.20 sh -c 'cp /src /etc/caddy/Caddyfile && chmod 644 /etc/caddy/Caddyfile'

sudo systemctl restart caddy
sudo systemctl status caddy --no-pager -n 20
```

## Firewall (UFW)
Check:
```bash
sudo ufw status verbose
```

If UFW is active, ensure these are allowed:
- `80/tcp`
- `443/tcp`
- `8448/tcp`

(As of bring-up time, UFW was **inactive**.)

## Verification
Direct to Conduit (loopback):
```bash
curl -sS http://127.0.0.1:8008/_matrix/client/versions
```

Via Caddy (TLS):
```bash
curl -sS https://matrix.gruted.us.com/_matrix/client/versions
curl -sS https://matrix.gruted.us.com:8448/_matrix/federation/v1/version
```

Expected federation response includes `{"server":{"name":"Conduit","version":"..."}}`.

Verify registration is disabled (default):
```bash
curl -sS -X POST -H 'Content-Type: application/json' --data '{}' \
  http://127.0.0.1:8008/_matrix/client/v3/register
# expect: M_FORBIDDEN: Registration has been disabled.
```

## Create users (@ted and @gru) with token-gated registration
1) Enable token-gated registration:
```bash
MATRIX_BWS_PROJECT_ID=51ba57e6-de28-47ef-82ec-b3e9012ec71a \
  ~/.local/bin/matrix-secrets-env --enable-registration
cd /home/gru/.openclaw/workspace/deploy/matrix
sudo docker compose restart conduit
```

2) Using Element (manual):
- Open Element (web or desktop)
- Choose **Create account**
- Homeserver: `matrix.gruted.us.com`
- Create:
  - `@ted:matrix.gruted.us.com`
  - `@gru:matrix.gruted.us.com`
- When prompted for the registration token, retrieve it from Bitwarden Secrets Manager:
  - key: `matrix/prod/conduit_registration_token`

Do **not** paste the token into chat/logs.

3) Disable registration again:
```bash
MATRIX_BWS_PROJECT_ID=51ba57e6-de28-47ef-82ec-b3e9012ec71a \
  ~/.local/bin/matrix-secrets-env
cd /home/gru/.openclaw/workspace/deploy/matrix
sudo docker compose restart conduit
```

## Backup reminder
Back up `conduit_data` regularly; it contains the homeserver signing keys.
Example (short downtime):
```bash
cd /home/gru/.openclaw/workspace/deploy/matrix
sudo docker compose stop conduit

sudo docker run --rm \
  -v conduit_data:/data:ro \
  -v /root:/backup \
  alpine sh -c 'cd /data && tar -czf /backup/conduit_data_$(date -u +%Y%m%dT%H%M%SZ).tar.gz .'

sudo docker compose start conduit
```
