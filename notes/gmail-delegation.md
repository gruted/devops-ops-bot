# Gmail delegation (Workspace Admin + gog CLI)

## Goal
Enable **Gmail mail delegation** for the inbox bot, so a delegate account (the bot user) can access another user’s mailbox (the “owner”).

This has two pieces:
1) **Admin Console**: allow mail delegation for the relevant org unit(s).
2) **Per-mailbox**: add the delegate relationship (owner → delegate).

---

## 1) Admin Console (domain-wide / OU setting)
Path (Google Admin):
- **Apps → Google Workspace → Gmail → User settings → Mail delegation**

(Separately, if you’re using a **service account with domain-wide delegation (DWD)**, you must also configure DWD in Admin Console:)
- **Security → Access and data control → API controls → Domain-wide delegation**
  - Add new, using this service account’s **OAuth client ID**
    - From `/home/gru/.openclaw/oauth2-desktop-488001-40c6285f27a7.json`: `client_id` = `118019581540102832199`
  - Scopes (minimum for mail delegation management):
    - `https://www.googleapis.com/auth/gmail.settings.sharing`
    - (Often also needed elsewhere in the inbox bot): `https://www.googleapis.com/auth/gmail.readonly`

Actions:
- Select the correct **Org Unit** (top-left OU tree).
- Ensure **Mail delegation** (aka “Grant access to your account”) is **ENABLED** for that OU.
- Save.

Notes:
- If disabled, users/API calls to add delegates typically fail.
- This is an admin-only control; can’t be changed via standard Gmail API.

---

## 2) Add delegate for a mailbox
### Using gog CLI (preferred if auth is set up)
`gog` supports Gmail delegate operations via the Gmail API.

Important:
- You must run commands **as the mailbox owner** (the account being delegated).
- Required OAuth scope (conceptual): `https://www.googleapis.com/auth/gmail.settings.sharing`

Commands:
- List delegates on the owner mailbox:
  ```bash
  gog --account "OWNER@DOMAIN" gmail settings delegates list --json
  ```

- Add a delegate (bot user):
  ```bash
  gog --account "OWNER@DOMAIN" gmail settings delegates add "BOT@DOMAIN" --json
  ```

- Check status for one delegate:
  ```bash
  gog --account "OWNER@DOMAIN" gmail settings delegates get "BOT@DOMAIN" --json
  ```

Expected status fields (Gmail API):
- `delegateEmail`
- `verificationStatus`: typically `accepted` or `pending`

Remove delegate:
```bash
gog --account "OWNER@DOMAIN" gmail settings delegates remove "BOT@DOMAIN"
```

### Auth setup reminders for gog
Run one of:
- OAuth user token (interactive once):
  ```bash
  gog auth add OWNER@DOMAIN
  gog auth list
  ```

- Or service-account impersonation (Workspace domain-wide delegation), if configured:
  ```bash
  gog auth service-account set --key /home/gru/.openclaw/oauth2-desktop-488001-40c6285f27a7.json OWNER@DOMAIN
  gog auth service-account status OWNER@DOMAIN
  ```

If `gog auth list` shows **no tokens stored**, delegation commands won’t work until an auth method is configured.

---

## 3) Manual per-mailbox setup (Gmail UI)
If you prefer UI instead of CLI:
- In the **owner’s Gmail**: Settings → **Accounts** (or “Accounts and Import”) → **Grant access to your account** → Add delegate.

---

## 4) Testing
1) Sign in as the **delegate** (bot user) in Gmail Web.
2) Use the account menu to **switch to/access the owner mailbox** (Gmail will show “(Delegated)” or similar).
3) Confirm:
   - Inbox visible
   - Ability to read / act as expected
   - (Optional) ability to send as owner if configured/desired (separate “Send mail as”/alias settings)

---

## Current state (as of 2026-02-20)
- `gog` is installed (`gog 0.9.0`), but **no auth tokens are stored** (`gog auth list` => “No tokens stored”).
- Admin Console requires a Google login; the OpenClaw isolated browser currently lands on the Google sign-in page.

Next required inputs:
- The Workspace admin / owner account email(s).
- The bot delegate account email.
- A login method (OAuth token or service-account DWD) available in this environment.
