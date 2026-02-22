Post-cutover security audit plan (non-destructive)

Scope
- Review host firewall/UFW posture for the VPS running Caddy, Matrix, Vikunja, and other services.
- Audit exposed ports (80, 443, 8448, 22) and running services listening on them.
- Provide an SSH hardening checklist (non-destructive checks + recommended changes).
- Check for Docker socket (/var/run/docker.sock) exposure to containers and recommend mitigations.
- Produce a backup plan for Matrix signing keys and Vikunja DB (discovery, backup, encryption, retention, restore test recommendations).

Guiding principle
- This is an audit and checklist only. Do not apply changes without explicit approval from the operator. All commands below are read-only or informational where possible.

Quick summary (action priorities)
1) Audit firewall & open ports (LOW impact, do first).
2) Verify SSH posture and blocklist/monitoring (LOW impact, urgent if public SSH allowed).
3) Verify docker socket exposure and container volumes (LOW impact, high risk if exposed).
4) Ensure backups exist for Matrix signing keys and Vikunja DB and that restores are tested (CRITICAL for recovery).
5) Implement recommended hardening actions after operator review and approval.

Non-destructive checks (commands to run locally as root or with sudo)
- List firewall/UFW status and rules:
  - sudo ufw status verbose
  - sudo iptables -L -n -v
  - sudo nft list ruleset  # if using nftables

- List listening sockets and owning processes:
  - sudo ss -tunlp
  - sudo lsof -i -P -n | egrep 'LISTEN|ESTABLISHED'

- Confirm which processes bind 80/443/8448/22:
  - sudo ss -ltnp | egrep ':80|:443|:8448|:22'
  - If Caddy is fronting services, inspect Caddyfile: sudo cat /etc/caddy/Caddyfile

- UFW specifics to check:
  - Default policies: sudo ufw status verbose -> ensure "Default: deny (incoming), allow (outgoing)" or similarly strict setting
  - Look for rules allowing 22/80/443/8448 from anywhere; note which ones should be restricted to specific sources.

- SSH checks (informational):
  - View current sshd config: sudo grep -v '^#' /etc/ssh/sshd_config | sed '/^$/d'
  - Check failed/successful login attempts: sudo journalctl -u ssh --no-pager | tail -n 200
  - Check which users can SSH: grep -E "^AllowUsers|^AllowGroups" /etc/ssh/sshd_config || echo "None set"

- Docker/socket checks:
  - List containers and bind mounts: sudo docker ps --format '{{.ID}} {{.Names}}' && for id in $(sudo docker ps -q); do sudo docker inspect --format '{{.Name}} {{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}' $id; done
  - Search compose files for socket mounts: grep -R "docker.sock" -n /home /srv /etc || true
  - Check if Docker API/TCP is exposed: sudo ss -ltnp | egrep ':2375|:2376' || true

- Matrix signing keys discovery:
  - Check homeserver config for key paths: sudo grep -n "signing" -n /etc/matrix-synapse -R || true
  - Common locations to check: /etc/matrix-synapse/, /var/lib/matrix-synapse/, /root/.synapse/ — use: sudo find / -type f -iname "*signing*" -o -iname "*_signing*" 2>/dev/null || true
  - If Matrix is containerized, inspect container filesystem (docker cp or docker exec -- ls) to locate /data or /synapse directories.

- Vikunja DB discovery:
  - Determine DB type from Vikunja env or config (docker-compose.yml, env file, or process args).
  - For Postgres: locate PG connection string in env and confirm DB host/credentials.
  - For SQLite: find .db files (commonly in volume bind e.g., /var/lib/vikunja or container data directories).

Checklist (detailed items to verify, with recommended actions)

A. Firewall / UFW
- Verify default UFW policy is to deny incoming traffic.
  - Recommended: sudo ufw default deny incoming; sudo ufw default allow outgoing.
- Restrict SSH (port 22):
  - If management IP(s) known: restrict SSH to those IPs with ufw allow from x.x.x.x to any port 22 proto tcp.
  - If dynamic IPs used: consider VPN/jump host or use ephemeral authorization tooling (e.g., ssh certs).
  - If immediate restriction not possible, enable rate limiting: sudo ufw limit ssh/tcp
- Exposed service ports:
  - 80/443: required for HTTP/HTTPS. Prefer to keep 80 only for redirect to 443 and terminate TLS at Caddy.
  - 8448: required for Matrix federation. Keep open only if you intend to federate; ensure TLS and correct Caddy routing.
  - Recommendation: document which ports need external access and close everything else.
- IPv6: Verify UFW rules apply to IPv6 if the host has IPv6 connectivity (ufw status verbose shows IPv6). Ensure consistent rules.
- Logging & monitoring: Ensure UFW logging is enabled (sudo ufw logging on) and integrate logs with syslog/ELK or a lightweight collector.

B. SSH hardening (audit items + recommended config changes)
- Current checks (non-destructive): review /etc/ssh/sshd_config as above.

Recommended settings (apply only after approval):
- PermitRootLogin no
- PasswordAuthentication no  # enforce keys; if disabling password, ensure keys are installed!
- ChallengeResponseAuthentication no
- UsePAM no or yes depending on system requirements (be conservative)
- MaxAuthTries 3
- LoginGraceTime 30s
- AllowUsers <specific-admin-usernames> or use AllowGroups sshadmins
- PermitEmptyPasswords no
- X11Forwarding no (unless required)
- Use only strong KexAlgorithms, Ciphers, MACs (follow current OpenSSH recommendations); alternatively keep OpenSSH defaults but ensure it's up-to-date.
- Consider setting IdleTimeoutInterval (ClientAliveInterval) and ClientAliveCountMax to drop stale sessions.

Additional recommendations:
- Prefer SSH certificate-based auth via an internal CA if you have >2 admins.
- Enforce hardware-backed keys (YubiKey) for highly-privileged accounts.
- Run fail2ban or equivalent (or rely on ufw rate-limiting) to block brute-force IPs.
- Narrow the set of allowed SSH users and use sudo for privilege escalation.

C. Docker socket exposure
- Check for containers that mount /var/run/docker.sock. Any container with the socket has effective root on host.
- Recommended mitigations (do not change without approval):
  - Remove /var/run/docker.sock mounts from untrusted containers.
  - If remote management required, enable Docker API over TLS-only on a specific interface (2376) with client certs — avoid binding to 0.0.0.0.
  - Consider running services in rootless Docker or using containerd/nerdctl if appropriate.
  - Use least-privilege patterns: avoid granting docker group membership to many users.
  - Use a socket proxy (socat with TLS + auth) only for well-controlled use cases.

D. Application-level checks
- Caddy:
  - Confirm Caddy listens on the expected addresses and ports (check /etc/caddy/Caddyfile and systemd service).
  - Ensure TLS certs are present and auto-renewal is working (caddy logs + systemctl status caddy).
- Matrix (Synapse or other):
  - Confirm federation port 8448 is TLS-protected; check that public_federation_url and tls config are correct.
  - Verify homeserver.yaml points to signing key locations; ensure the signing keys are backed up.
- Vikunja:
  - Confirm Vikunja DB type and location. If using Postgres, ensure it's not exposed publicly.

E. Backups — Matrix signing keys
- Discovery:
  - Locate signing key(s) by reading homeserver config or searching common paths. If containerized, inspect container filesystem.
  - Note: Matrix signing keys are critical to federation and cannot be reissued without breaking trust. Back them up immediately.

- Recommended backup actions (non-destructive to run):
  - Copy key files to a secure backup location (example, on a separate host or S3 bucket) and encrypt at rest.
    - Example (do not run blindly): sudo cp /path/to/matrix-signing.key /root/backups/ && gpg --symmetric --cipher-algo AES256 /root/backups/matrix-signing.key
  - Use GPG or age to encrypt backups. Store keys/passwords in your secrets manager (e.g., Bitwarden or cloud KMS).
  - Keep at least 3-5 backup generations and store at least one offline/offsite copy.
  - Document exact key filenames, associated config lines, and who has access.
  - Test restore process to a non-production instance quarterly.

F. Backups — Vikunja DB
- Discovery:
  - Find DB type from env/docker-compose or Vikunja config. If Postgres, use pg_dump; if SQLite, copy DB file carefully.

- Recommended backup actions:
  - Postgres (recommended):
    - Use pg_dump or pg_dumpall (for cluster/global objects). Example (informational): pg_dump -Fc -h <host> -U <user> <dbname> > vikunja-$(date +%F).dump
    - Automate daily dumps, rotate, and test restores.
  - SQLite (if used):
    - Ensure filesystem-level consistency; prefer sqlite3 "VACUUM INTO" or use WAL mode and copy the DB while stopping the service briefly or using sqlite3 to create a consistent dump: sqlite3 /path/to/db .dump > dump.sql
  - Encrypt backups (GPG/age) and store offsite (S3, object storage, or separate backup host).
  - Keep retention policy (e.g., daily ×14, weekly ×8, monthly ×6) and test restores.

G. Monitoring & Detection
- Ensure logs are collected for sshd, Caddy, Matrix, and containerd/docker.
- Configure alerting for repeated SSH failures, high-rate connections on 22, or new listening sockets on unexpected ports.
- Consider adding a simple port-monitoring script or integrate with an external uptime/port monitor.

H. Inventory & Documentation
- Document:
  - Which ports are intentionally open and why (80, 443, 8448, 22 if needed).
  - Where critical files live (matrix signing keys, Vikunja DB file or connection details).
  - Backup locations and restore runbooks (step-by-step commands to restore matrix keys and Vikunja DB).

Sample non-destructive commands the auditor should run (copy/paste-ready)
- sudo ufw status verbose
- sudo ss -tunlp | egrep ':80|:443|:8448|:22'
- sudo docker ps -q | xargs -r -n1 sudo docker inspect --format '{{.Name}} {{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}'
- sudo find / -type f -iname '*signing*' -o -iname '*matrix*key*' 2>/dev/null | sed -n '1,200p'
- sudo grep -R "VIKUNJA" -n /etc /home /srv || true  # quick heuristic for locate

Recommended next steps (operator approval required before applying)
1) Run the non-destructive checks above and capture their outputs to a temp directory for review (/root/audit-output-YYYYMMDD/).
2) Confirm Matrix signing key location and immediately archive an encrypted copy off-host.
3) If Vikunja DB is not backed up, create a backup schedule and perform an initial full backup.
4) Restrict SSH access (either by ufw allow from <admin-ip> to 22 or implement certificate-based SSH) after scheduling a maintenance window to avoid locking out admins.
5) Remove any excessive docker.sock mounts from containers that do not require them.
6) Harden sshd_config according to the checklist above and test with an open session before closing old sessions.
7) Implement monitoring/alerting for repeated SSH failures and new listening sockets.

Notes, caveats, and references
- Some recommendations (e.g., disabling password auth, changing SSH port, or removing docker.sock mounts) can lock out administrators if not coordinated. Always keep an open session or console access until changes verified.
- Federation (Matrix) requires 8448 open by design; do not close it unless you intentionally stop federation.
- Locations for Matrix signing keys and Vikunja DB vary with packaging (native vs container). Use the discovery commands above to find exact paths before backing up.

Deliverables (written into repository)
- This checklist: notes/security-audit-plan.md (this file).
- A short state update link will be added to STATE.md pointing to this file.

If you want, I will:
- Run the non-destructive discovery commands and collect outputs into /root/audit-output-<date>/ (requires approval to run commands).
- Prepare a minimal playbook/ansible-task list of the approved changes for safe application.

Do not apply any changes until you explicitly approve each change step.