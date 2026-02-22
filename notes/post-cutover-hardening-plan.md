# Post-cutover hardening plan (no execution)

**When to run:** Immediately after cutover is declared successful (Matrix + Vikunja + OpenClaw stable), before opening access beyond the minimum.

**Goal:** Reduce externally reachable attack surface, confirm intended exposure and trust boundaries, validate logs/auditing, and ensure backups/restore + rollback are feasible.

**Reference checklist (don’t duplicate):** See `notes/post-cutover-security-audit.md` for the detailed audit checklist and command suggestions. This document is the *plan* for what to tighten and verify post-cutover.

---

## 1) Freeze the intended public entrypoints (source-of-truth)
Create/confirm a written “exposure contract” for the host(s):

- **Publicly reachable from the Internet:**
  - TCP 443 (HTTPS) via Caddy (authoritative reverse proxy)
  - TCP 80 only if needed for ACME HTTP-01 and/or redirect to HTTPS (otherwise disable)
- **Conditionally public:**
  - TCP 22 (SSH) *only* if you can’t restrict it (target: restricted to trusted IPs/VPN)
- **Not public (internal-only):**
  - Databases (Postgres/MySQL), Redis, admin dashboards
  - Conduit/Matrix app ports (behind reverse proxy only)
  - Vikunja API/UI ports (behind reverse proxy only)
  - OpenClaw gateway/admin ports (behind reverse proxy and/or bound to localhost)

Output artifact: a short list of **domains → upstream service → internal port → auth boundary**.

---

## 2) Service exposure inventory (what runs, where it listens, how it’s protected)
Build an inventory table (even rough) for each service:

### 2.1 Caddy (reverse proxy)
- **Role:** single ingress; TLS termination; HTTP→HTTPS redirect; routing to upstreams.
- **Exposure target:** public 443 (and optionally 80).
- **Hardening targets:**
  - Ensure *only* Caddy binds to 0.0.0.0:80/443.
  - Ensure upstream services bind to `127.0.0.1` or a private docker network (no published ports).
  - Confirm ACME storage and configs are root-readable only (or caddy user) and backed up (config only; certs optional because ACME can reissue).

### 2.2 Matrix (Conduit)
- **Role:** Matrix homeserver.
- **Exposure target:** Matrix client/server APIs accessible via Caddy over 443 only.
- **Hardening targets:**
  - Conduit service port not publicly published; only reachable from Caddy.
  - Confirm federation requirements are met (SRV/.well-known/correct routing) without exposing extra ports.
  - Ensure the **Conduit signing key** is treated as a crown jewel (backup + permissions + offline copy).

### 2.3 Vikunja
- **Role:** task management.
- **Exposure target:** user access via Caddy over 443 only.
- **Hardening targets:**
  - Vikunja does not publish container ports to the public interface.
  - If attachments/uploads exist, verify permissions and path traversal protections (generally app-level) and ensure backups include attachments.

### 2.4 OpenClaw (gateway/daemon)
- **Role:** automation gateway and tool relay.
- **Exposure target:** ideally **not** broadly public.
- **Hardening targets (choose one model and commit to it):**
  1) **Local-only**: bind admin/API ports to localhost; access via SSH tunnel.
  2) **Reverse-proxied**: expose only via Caddy + strong auth (OIDC/basic auth/mTLS) + allowlist.
  3) **VPN-only**: reachable only over Tailscale/WireGuard.
- Inventory any paired nodes and ensure they do not expand inbound exposure unintentionally.

Output artifact: an “inventory + stance” section stating explicitly which model you chose for OpenClaw.

---

## 3) Firewall / UFW tightening targets
**Objective:** default-deny inbound; explicitly allow only what the exposure contract requires.

### 3.1 Target inbound rules (typical single-host)
- Allow: 443/tcp
- Allow: 80/tcp *(only if required)*
- Allow: 22/tcp *(restricted to trusted IPs / VPN endpoint where feasible)*
- Deny: everything else inbound

### 3.2 Tightening checklist (UFW/nftables/provider firewall)
- Host firewall enabled and persistent.
- Provider firewall mirrors host intent (defense-in-depth).
- SSH restrictions (pick as many as possible):
  - IP allowlist (best)
  - Move SSH behind VPN
  - Disable password auth; enforce keys; consider `AllowUsers` / `PermitRootLogin no`
- If Docker is in use:
  - Verify Docker’s iptables rules aren’t effectively bypassing UFW policy.
  - Prefer internal docker networks and avoid `-p 0.0.0.0:PORT:PORT` unless it is *Caddy’s* port.

Deliverable: a “before/after” summary of open ports (expected vs observed) captured per `post-cutover-security-audit.md`.

---

## 4) Log / audit checks (operational assurance)
This is not a full SIEM—just enough to detect obvious regressions post-cutover.

### 4.1 What to verify
- **journald**
  - Services are logging to journald (or to files that are rotated).
  - No secrets in logs (spot-check).
  - Log retention is sane for the host’s disk size.
- **Auth / intrusion signals**
  - SSH auth logs show only expected attempts; consider fail2ban if SSH remains public.
- **Reverse proxy access/error logs**
  - Enable access logs if you need auditability; ensure sensitive endpoints aren’t leaking tokens.
- **App-level logs**
  - Conduit: startup, federation errors, signing key load, DB connectivity.
  - Vikunja: migrations, auth failures, file/attachment warnings.
  - OpenClaw: gateway connectivity, node pairing events, unexpected inbound attempts.

### 4.2 Minimal “post-cutover watch” window
- For the first 24–48 hours post-cutover:
  - Review errors at least twice (morning/evening) and after any config change.
  - Pay special attention to: repeated 401/403 spikes, brute-force patterns, sudden 5xx bursts, certificate renewal warnings.

Deliverable: short notes: “what we checked, what we saw, action items”.

---

## 5) Backup verification notes (especially Conduit data + signing keys)
Backups are only real if restore is plausible.

### 5.1 Identify the backup set (by component)
- **Conduit (Matrix):**
  - Conduit data directory (includes media/state as configured)
  - Database backup (if Conduit uses external DB)
  - **Signing key(s)** (critical)
  - Any `.well-known` files / Caddy config relevant to Matrix routing
- **Vikunja:**
  - Database backup
  - Attachments/uploads directory (if used)
  - App config
- **Caddy:**
  - Caddyfile + snippets + systemd unit overrides
  - ACME account/config (optional to back up; convenient but not strictly required)
- **OpenClaw:**
  - Gateway config/state required to reconnect (tokens/config)
  - Node pairing/credentials as applicable

### 5.2 Conduit signing key: handling and verification
Hardening targets:
- Ensure the signing key file is:
  - Readable only by the Conduit service user
  - Included in encrypted, off-host backups
  - Copied to an offline “break glass” location (encrypted) with clear retrieval instructions
- Verification steps (no execution here):
  - Confirm you can locate it quickly (path documented).
  - Confirm backups contain it (by inspecting backup manifest, not by pasting key material).
  - Confirm that restoring *without* the key is unacceptable (it would break server identity); treat as highest priority.

### 5.3 Backup health indicators
- Last successful backup timestamp (per component)
- Retention policy and where backups live (off-host)
- Encryption method and where decryption keys live

### 5.4 Restore confidence (time-boxed)
Plan a small restore rehearsal (even partial):
- Restore configs + one database dump into a scratch environment (or validate dumps are readable).
- Confirm you can restore Conduit signing key *without* exposing it in logs.

Deliverable: a short “backup + restore confidence report”.

---

## 6) Minimal rollback plan (keep it simple)
**Goal:** If the cutover is “working but unsafe/unreliable,” revert quickly with minimal data loss.

### 6.1 Define rollback triggers
Examples:
- Unexpected public exposure (DB/admin ports reachable)
- Persistent 5xx or federation failures for Matrix
- Auth bypass or suspected compromise
- Backup failures + data integrity concerns

### 6.2 Rollback options (choose the minimal viable)
- **DNS rollback:**
  - Reduce TTL ahead of time (if possible) and be ready to repoint A/AAAA back to previous host.
- **Reverse proxy rollback:**
  - Keep last-known-good Caddy config version available.
- **Service rollback:**
  - Keep previous container images/tags or package versions accessible.
  - Keep prior systemd unit files/compose manifests.

### 6.3 Data considerations (Matrix/Vikunja)
- Decide and document one policy:
  - **Strict rollback** (prefer integrity): stop writes, restore DB/files from pre-cutover snapshot.
  - **Best-effort rollback** (prefer continuity): keep post-cutover data and migrate forward later.
- For Matrix specifically:
  - Avoid changing signing keys during rollback.
  - If you must restore, ensure the signing key remains consistent.

### 6.4 Minimum rollback playbook (outline)
1) Freeze changes (stop deploys)
2) Capture current state (ports/listeners + logs snapshot)
3) Switch DNS back (or disable new ingress)
4) Restore last-known-good configs/services
5) Validate core user flows

Deliverable: one-page rollback runbook with the exact “who/what/where” steps and where to find backups/configs.

---

## 7) Completion criteria
Declare hardening “done” when:
- Observed open ports match the exposure contract.
- Firewall is default-deny inbound with explicit allows only.
- No unintended published container ports.
- Logs reviewed; no obvious brute-force/5xx patterns; no secrets in logs.
- Backups are current, off-host, encrypted; Conduit signing key is verified present in backup sets.
- A minimal rollback path is written and feasible.

---

## 8) Suggested artifacts to save (in `notes/`)
- `post-cutover-exposure-contract.md` (optional)
- `post-cutover-hardening-plan.md` (this doc)
- `post-cutover-security-audit.md` (already exists; run and record results)
- `post-cutover-backup-restore-confidence.md` (optional)
