# Gmail IMAP via himalaya (headless) for OpenClaw

Goal: have a headless IMAP client (himalaya) authenticate to Gmail using an **App Password** fetched at runtime from **Bitwarden Secrets Manager** (`bws`).

## Current status (2026-02-20)
- `bws` installed: `bws 2.0.0`
- Machine token present: `~/.config/openclaw/bitwarden-sm.token`
- Bitwarden project: `openclaw-prod` (`~/.config/openclaw/bitwarden-sm.project`)
- Secret exists: `GRU_GMAIL` (id `9e9717e0-1b31-48af-8a2c-b3f700121d07`)
- himalaya installed: `himalaya v1.1.0`

### Problem
IMAP auth fails with `AUTHENTICATIONFAILED (Invalid credentials)`.
The current `GRU_GMAIL` secret value **does not look like** a Gmail app password (Gmail app passwords are typically 16 lowercase letters). So himalaya cannot authenticate.

## himalaya config
Config file: `~/.config/himalaya/config.toml` (chmod 600)

Account section:
```toml
[accounts.gru_gmail]
email = "gruted.us.com@gmail.com"
display-name = "Gru (OpenClaw)"
ackend.type = "imap"
backend.host = "imap.gmail.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "gruted.us.com@gmail.com"
backend.auth.type = "password"
backend.auth.cmd = "himalaya-gru-gmail-pass"

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.gmail.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "gruted.us.com@gmail.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.cmd = "himalaya-gru-gmail-pass"
```

### Password command helper
Script installed:
- `~/.local/bin/himalaya-gru-gmail-pass` (chmod 700)

Behavior:
- Reads the bws machine token from `~/.config/openclaw/bitwarden-sm.token`
- Fetches `GRU_GMAIL` (secret id `9e9717e0-1b31-48af-8a2c-b3f700121d07`) via `bws secret get ...`
- Prints the secret value only (stdout), suitable for `backend.auth.cmd`

## Test commands
List latest envelopes:
```bash
himalaya envelope list -a gru_gmail -f INBOX -s 5 -o json 'order by date desc' | jq '.[0:5] | map({id,subject,from,date,flags})'
```

Send a test email (optional):
```bash
echo "hello" | himalaya message send -a gru_gmail --to you@example.com --subject "himalaya test" --stdin
```

## Required fix (Bitwarden)
Update the Bitwarden SM secret `GRU_GMAIL` to be a **valid Gmail App Password** for `gruted.us.com@gmail.com`.

Reference steps: `notes/gmail-app-pw.md`.

After updating the secret, rerun the test command above.

## Cron / bot wiring (TODO)
The inbox bot code can call himalaya using `HIMALAYA_ACCOUNT=gru_gmail`.
Once IMAP auth works:
- Add a cron/systemd timer to run the inbox triage flow periodically.
- Ensure any logs do **not** print secrets (himalaya config uses a command, not inline password).
