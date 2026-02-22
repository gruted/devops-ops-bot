# OpenClaw (VPS) — secrets ↔ env var mapping (Bitwarden SM project 51ba57e6-de28-47ef-82ec-b3e9012ec71a)

Scope: determine the *minimal* environment variables OpenClaw needs on this VPS given current configuration, and reconcile against Bitwarden Secrets Manager keys.

> Safety: This doc lists **keys only**. Do **not** paste secret values here.

---

## 1) What OpenClaw actually reads (per installed `openclaw` code)

From the installed OpenClaw distribution (`/home/gru/.npm-global/lib/node_modules/openclaw/dist/*`):

- `OPENAI_API_KEY`
  - Used for provider `openai/*` authentication.

- `OPENCLAW_GATEWAY_TOKEN`
  - Used as the gateway auth token.
  - Precedence (observed in code): `process.env.OPENCLAW_GATEWAY_TOKEN` overrides config tokens.
  - Back-compat aliases exist in some call paths:
    - `CLAWDBOT_GATEWAY_TOKEN`

- `OPENCLAW_GATEWAY_PORT`
  - Used to select gateway port in some entry paths.
  - Back-compat alias:
    - `CLAWDBOT_GATEWAY_PORT`

Given **this VPS’s current systemd unit** uses `... gateway --port 18632`, `OPENCLAW_GATEWAY_PORT` is not strictly required (port is already specified by CLI flag), but keeping it is harmless.

---

## 2) Current OpenClaw VPS configuration that matters

### 2.1 OpenClaw config file

`/home/gru/.openclaw/openclaw.json` contains (among other fields):
- `agents.defaults.model.primary = openai/gpt-5.2` → implies an OpenAI API key is required unless switching auth mode.
- `gateway.auth.mode = token`
- `gateway.auth.token = (present in file)` → sensitive, and duplicates the token also present in systemd env.

### 2.2 systemd user service

`openclaw-gateway.service` currently sets:
- `OPENCLAW_GATEWAY_TOKEN` (inline, sensitive)
- `OPENCLAW_GATEWAY_PORT=18632` (non-secret)

A drop-in also loads an `EnvironmentFile=` generated at start.

### 2.3 Local dotenv

`/home/gru/.openclaw/.env` currently contains `OPENAI_API_KEY` (sensitive) in plaintext.

---

## 3) Bitwarden SM (project) — keys present

Using `bws secret list <projectId> -o json | jq -r '.[].key'`, this project currently contains exactly:

- `OPENAI_API_KEY`
- `OPENCLAW_GATEWAY_TOKEN`

No other OpenClaw-related keys are currently present.

---

## 4) Minimal secret set (recommended)

Given current config + current service wiring, the minimal *secrets* needed at runtime are:

1. `OPENAI_API_KEY` — required for `openai/gpt-5.2`.
2. `OPENCLAW_GATEWAY_TOKEN` — required because gateway auth mode is `token`.

Everything else currently in the unit file (`OPENCLAW_GATEWAY_PORT`, `OPENCLAW_SYSTEMD_UNIT`, etc.) is **non-secret** and does not belong in Secrets Manager.

---

## 5) Reconciliation & recommendations

### 5.1 Bitwarden keys vs needs

- ✅ `OPENAI_API_KEY` exists in Bitwarden and is required.
- ✅ `OPENCLAW_GATEWAY_TOKEN` exists in Bitwarden and is required.
- ✅ No missing required secret keys.
- ✅ No extra secret keys in Bitwarden (project is minimal).

### 5.2 Recommended cleanup (to reduce secret sprawl)

These are **recommendations** (not executed here):

- Prefer **Bitwarden as the single source of truth** for both secrets:
  - Remove/stop using plaintext `/home/gru/.openclaw/.env` for `OPENAI_API_KEY`.
  - Remove/stop embedding `OPENCLAW_GATEWAY_TOKEN` directly in the systemd unit file.

- Avoid storing the gateway token in multiple locations:
  - Today it appears in:
    - Bitwarden secret `OPENCLAW_GATEWAY_TOKEN`
    - systemd unit `Environment=OPENCLAW_GATEWAY_TOKEN=...`
    - `openclaw.json` (`gateway.auth.token`)
  - Ideal: keep it only in Bitwarden (plus the machine-token bootstrap file used to fetch secrets).

### 5.3 Naming / renames

- No renames recommended.
  - OpenClaw expects `OPENAI_API_KEY` and `OPENCLAW_GATEWAY_TOKEN` by those exact names.
  - Aliases like `CLAWDBOT_GATEWAY_TOKEN` exist for compatibility but are not needed.

---

## 6) If you *do* want to rename keys anyway

Not recommended; would require adding a *new* key with the expected name and migrating consumers.

If you still want to perform a rename in Bitwarden, use **explicit** `bws secret edit` commands.

Template (do not run until you’ve decided):

```bash
# 1) List secrets to get IDs (keys only)
export BWS_ACCESS_TOKEN="$(cat ~/.config/openclaw/bitwarden-sm.token)"
PROJECT_ID="51ba57e6-de28-47ef-82ec-b3e9012ec71a"
bws secret list "$PROJECT_ID" -o json | jq -r '.[] | [.id, .key] | @tsv'

# 2) Rename one secret by id
# bws secret edit <secret-id> --key NEW_KEY_NAME
```

(Exact flags can vary slightly by `bws` version; check `bws secret edit --help`.)
