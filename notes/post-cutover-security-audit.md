# Post-cutover security audit checklist (Matrix + Vikunja)

**When to run:** After Matrix + Vikunja are confirmed working for Ted (cutover complete).

**Goal:** Verify exposure is intentional, secrets are contained, services run with least privilege, and recovery paths (backups/updates) are in place.

---

## 0) Prep / scope
- Record host(s), public domains, and the **intended** public entrypoints (typically :443 only).
- Confirm which reverse proxy is authoritative (e.g., Caddy) and which services are internal-only.

## 1) Network surface (ports + listeners)
- List listeners:
  - `ss -tulpn` (or `ss -lntup`) and save output for the audit record.
- Validate **only expected ports** are reachable from the Internet:
  - Expected: `80/tcp` (redirect/ACME) and `443/tcp`.
  - Ensure DB/Redis/admin ports are **not** publicly reachable.
- If using Docker:
  - `docker ps --format 'table {{.Names}}\t{{.Ports}}'`
  - Confirm containers are not publishing ports unnecessarily (prefer internal networks + reverse proxy).

## 2) Firewall policy
- Confirm host firewall is enabled and default-deny inbound (as appropriate):
  - UFW: `ufw status verbose`
  - nftables: `nft list ruleset`
- Verify explicit allow rules are minimal (SSH restricted where possible; HTTP/HTTPS allowed).
- If behind a provider firewall (Hetzner/Cloud/etc.), confirm it matches host firewall intent.

## 3) Reverse proxy / TLS / headers
- Confirm TLS is valid and modern:
  - Certificate covers intended domains, auto-renewal works, no unexpected SANs.
  - Disable/avoid weak protocols/ciphers (generally handled by Caddy defaults).
- Confirm routing is correct:
  - Matrix endpoints map only to Conduit (and any well-known paths as needed).
  - Vikunja routes only to its API/UI as intended.
- Confirm security headers are sane (where applicable):
  - HSTS (if appropriate for the domain), X-Content-Type-Options, etc.
- Confirm HTTP → HTTPS redirect works and does not leak internal hostnames.

## 4) Secrets sprawl / configuration hygiene
- Identify where secrets live and ensure **one source of truth** (Bitwarden SM):
  - Check for stray `.env` files, shell history, compose files, unit files, Caddyfile snippets.
  - `rg -n "(PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)" /path/to/deploy` (use carefully; don’t paste secrets into tickets/logs).
- Ensure secrets are **not**:
  - Stored in Git, world-readable files, container image layers, or in process args.
- Confirm rotation path:
  - If a secret is rotated in SM, document what needs restart/reload.

## 5) systemd units & environment handling
- For each service unit (gateway/matrix/vikunja/reverse proxy):
  - `systemctl cat <unit>`
  - Confirm secrets are injected via `EnvironmentFile=` with correct permissions **or** via an exec wrapper that reads from SM.
  - Ensure units do not embed secrets directly in `ExecStart=`.
- Verify hardening options where feasible:
  - `User=` non-root
  - `NoNewPrivileges=true`
  - `ProtectSystem=strict` / `ProtectHome=true` (as compatible)
  - `PrivateTmp=true`
  - `CapabilityBoundingSet=` minimal
- Confirm logs don’t contain secrets:
  - `journalctl -u <unit> --no-pager | rg -i "token|secret|password"`

## 6) Least privilege (services, files, DB)
- Services run as dedicated users; files owned by those users.
- DB credentials:
  - Separate DB users per app where possible.
  - DB user privileges limited to the app’s database/schema.
- Docker:
  - Avoid `--privileged`, host networking, and mounting Docker socket unless required.
  - Minimize writable mounts; prefer read-only where possible.

## 7) Updates & vulnerability exposure
- OS patch posture:
  - `apt update && apt list --upgradable` (or distro equivalent).
- Container images:
  - Review image tags (avoid `latest` unless you have a deliberate update process).
  - Plan update cadence (e.g., monthly + urgent CVEs).

## 8) Backups & restore validation
- Confirm backups exist for:
  - Matrix/Conduit data directory + DB (if applicable)
  - Vikunja DB + attachments/files
  - Reverse proxy config + systemd units + deployment manifests
- Confirm:
  - Backup frequency, retention, and encryption.
  - Off-host storage (recommended).
  - **Restore test** plan (even a small, time-boxed test restores confidence).

## 9) Post-audit output (what to record)
- Date/time, who ran it.
- Expected vs observed open ports.
- Firewall rules summary.
- Where secrets are stored + any sprawl found.
- Backup status (locations, last success, restore test status).
- Action items + owners.

---

## Scheduling options (do not enable until requested)
- **Manual trigger (recommended initially):** run this checklist once Ted confirms Matrix + Vikunja are working post-cutover.
- **Reminder only (conditional):** if Ted requests, add a weekly cron (or preferably a systemd timer) to remind to rerun the checklist or at least review updates/backups.
  - Don’t schedule automatically; wait for explicit confirmation + request.
