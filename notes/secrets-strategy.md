# Secrets strategy (no 1Password service accounts, no 2FA churn)

## Constraints recap
- **No 1Password service accounts** → can’t use 1Password Connect/service tokens.
- **Hard requirement: no 2FA churn** → servers must not require periodic human re-auth.
- **Ubuntu VPS** and **OpenClaw automation**.
- Goal: durable, auditable secrets handling with sane rotation.

---

## Options compared

### 1) Bitwarden

#### A. Bitwarden **Secrets Manager** (preferred Bitwarden path)
**How it works**: create an Org + Project, issue **machine access tokens** for CI/servers; fetch secrets via API/CLI.

**Pros**
- Designed for non-human workloads (no 2FA churn once token is issued).
- Centralized control + auditing; easy rotation of a single secret value.
- Good fit if you’ll have **multiple servers/services**.

**Cons / gotchas**
- Requires Bitwarden plan that includes Secrets Manager.
- Still has a **bootstrap secret**: the machine token must live somewhere on the VPS.
- Vendor dependency + network dependency at runtime (unless you cache).

**Operational model**
- Treat the Bitwarden machine token as a *root secret*; store it in a root-only file and restrict access.
- Fetch at service start (ExecStartPre) or at deploy-time to produce an EnvironmentFile.

#### B. Bitwarden **Vault items** + CLI (`bw`)
**How it works**: use the standard Bitwarden CLI and log in/unlock.

**Pros**
- Works with many existing Bitwarden setups.

**Cons**
- CLI typically needs periodic login/unlock; can reintroduce human steps and 2FA friction.
- Not ideal for unattended servers.

**Verdict**: Only consider if you can guarantee a stable non-2FA flow (rare) and accept operational complexity.

---

### 2) HashiCorp Vault (AppRole)
**How it works**: run Vault (self-hosted or managed). Servers authenticate via **AppRole** (RoleID + SecretID) or other auth methods; fetch secrets dynamically.

**Pros**
- Strongest feature set: leasing/TTL, dynamic DB creds, PKI, policies, namespaces.
- Eliminates long-lived static secrets when using dynamic engines.
- Great when you need **real rotation automation**.

**Cons**
- Heavy operational burden: HA, storage backend, upgrades, backups, monitoring.
- Bootstrap still exists: SecretID (or another initial credential) must be provisioned to each host.
- Overkill for 1–2 services on a single VPS.

**Verdict**: Choose Vault if you explicitly want dynamic secrets + can accept operating Vault as a product.

---

### 3) SOPS + age (local encrypted file) — **best fit for your constraints**
**How it works**: store secrets in an encrypted file (e.g., `secrets.sops.yaml`) using **age** recipients. Decrypt on the VPS using an age private key.

**Pros**
- Minimal moving parts; no external dependency; no 2FA churn.
- Secrets can live in git safely (encrypted); good review/audit trail for *changes*.
- Very reliable for a single VPS or a small fleet.

**Cons / gotchas**
- Root secret is the **age private key** on the VPS. Protect it like SSH host keys.
- Rotation is “edit + re-encrypt” (static secrets) unless your app supports dynamic credentials.

**Verdict**: Best long-term baseline under the given constraints; can be upgraded later to Bitwarden SM or Vault.

---

### 4) Cloud Secret Managers (AWS/GCP)
**How it works**: store secrets in AWS Secrets Manager / SSM Parameter Store or GCP Secret Manager; instance authenticates via IAM.

**Pros**
- Strong managed service; auditing; rotation integrations.
- No 2FA churn for machines if IAM is set up correctly.

**Cons**
- If you’re on a generic VPS (not EC2/GCE), you still need bootstrap credentials (access key JSON, etc.).
- Vendor lock-in + extra cost.

**Verdict**: Great if you’re already on AWS/GCP with native instance identity; otherwise not ideal for a standalone VPS.

---

## Recommendation (short)
1. **Primary**: **SOPS + age** for secrets-at-rest in git + deterministic, no-churn operations.
2. **If/when you scale to multiple servers/teams**: migrate to **Bitwarden Secrets Manager** for centralized management; keep SOPS for infra-level bootstrapping if needed.
3. **Only adopt Vault** if you have a concrete need for dynamic secrets (DB leases, PKI) and can run Vault reliably.

---

## Implementation plan (SOPS + age on Ubuntu VPS)

### A. Bootstrap (one-time)
1. Install tooling:
   - `age`, `sops` (from packages or released binaries).
2. Create an **age keypair** on the VPS (or on an admin machine, then securely copy the private key to the VPS):
   - Private key path suggestion: `/etc/sops/age/keys.txt`
   - Permissions: `root:root`, `chmod 600`.
3. Record the **public recipient** in repo config (e.g., `.sops.yaml`) so new secrets are always encrypted to the VPS key.
4. Create encrypted secrets file(s), e.g.:
   - `secrets/app.env.sops.yaml` (key/value)
   - or `secrets/app.sops.json`.

### B. How OpenClaw / systemd should consume secrets
Avoid writing plaintext to disk permanently. Prefer tmpfs runtime locations.

**Pattern 1 (recommended): systemd + ExecStartPre decrypt → EnvironmentFile**
- Decrypt to `/run/<service>/env` (tmpfs) on each start.
- Example unit drop-in:

```ini
# /etc/systemd/system/myapp.service.d/secrets.conf
[Service]
EnvironmentFile=/run/myapp/env
ExecStartPre=/usr/local/bin/myapp-secrets-render
```

- Render script (`/usr/local/bin/myapp-secrets-render`):
  - `set -euo pipefail`
  - `install -d -m 0700 /run/myapp`
  - `sops -d /opt/myapp/secrets/app.env.sops.yaml | python/yq transform → KEY=VALUE lines`
  - write to `/run/myapp/env` with `chmod 600`

**Pattern 2: wrapper fetch-at-runtime**
- ExecStart runs a wrapper that decrypts and execs the app.
- Good when apps read secrets only from env and you want a single entrypoint.

**Why not plain `/etc/default/...`?**
- Long-lived plaintext on disk increases blast radius (backups, snapshots).

### C. Deploy workflow
- Secrets file stays encrypted in git.
- Deploy code to `/opt/myapp`.
- Only the VPS has the age private key to decrypt.

### D. Rotation
- Rotate any secret by editing the decrypted view and re-encrypting with SOPS.
- Restart the service to pick up new values.
- For high-risk credentials:
  - prefer *short-lived* tokens where the upstream supports it,
  - or rotate on a schedule (monthly/quarterly) and document.

### E. Backups and recovery
- Back up:
  - encrypted secrets in git,
  - the VPS age private key **separately** (secure offline storage).
- If VPS is lost and age key is lost, encrypted secrets are unrecoverable.

---

## What Ted must do
- Decide the target: **SOPS+age now**, optionally Bitwarden SM later.
- Perform one-time bootstrap:
  1) generate/store age private key securely,
  2) store encrypted secrets file(s) in repo,
  3) approve systemd unit change.
- Define a minimal rotation policy (e.g., “rotate API keys quarterly; rotate DB password monthly”).
- Keep the age key backup in an offline safe place.

---

## If choosing Bitwarden Secrets Manager later (migration sketch)
- Keep SOPS+age for the **bootstrap machine token** (chicken/egg).
- Services fetch secrets from Bitwarden at startup to `/run/<svc>/env`.
- Rotate secrets centrally in Bitwarden; restart services.
- Rotate machine tokens on a schedule; update SOPS file; restart.
