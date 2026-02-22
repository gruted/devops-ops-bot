# Vikunja access (local user)

## User
- **Username:** `ted`
- **Email:** `tedrebel@proton.me`
- **User ID (Vikunja DB):** `1` (as of 2026-02-06)

## Password storage
- Stored in **Bitwarden Secrets Manager**
  - **Project ID:** `51ba57e6-de28-47ef-82ec-b3e9012ec71a`
  - **Secret key:** `TED_VIKUNJA`

## Notes about the container
The `vikunja/vikunja` container used here does **not** include a shell and the CLI password prompt requires a TTY. So for automated create/reset, you must provide the password via the `--password/-p` flag.

Binary path inside the container:
- `/app/vikunja/vikunja`

## Verify user exists
```bash
sudo docker exec vikunja /app/vikunja/vikunja user list
```

## Reset password (direct)
1) Fetch the secret from Bitwarden SM into a shell variable (do **not** print it):
```bash
PW="$(
  env BWS_ACCESS_TOKEN="$(<~/.config/openclaw/bitwarden-sm.token)" \
  bws secret get 75d30054-157b-48fc-9e93-b3e9015357f7 --output json | jq -r '.value'
)"
```

2) Reset directly (no email required):
```bash
sudo docker exec vikunja /app/vikunja/vikunja user reset-password 1 --direct --password "$PW"
```

(Alternatively, if you don’t want to rely on user id `1`, look it up via `user list` first.)
