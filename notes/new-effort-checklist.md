# New Effort Checklist (Space + Rooms)

Use this whenever we start a new effort that needs its own coordination area in Matrix.

## 1) Create a Space
- Name: <Effort name>
- Owner: `@gru:matrix.gruted.us.com`
- Invite: `@ted:matrix.gruted.us.com`

## 2) Create standard rooms (unencrypted)
- `<effort>-announcements`
- `<effort>-workshop`
- `<effort>-alerts`

Optional:
- `<effort>-private` (E2EE, no bot)

## 3) Link rooms into the Space
- Add each room as a child of the Space (Space graph)

## 4) Invite Ted everywhere
- Invite Ted to the Space and each room

## 5) Wire OpenClaw to the rooms
- Add each room id (`!…`) to `~/.openclaw/openclaw.json` → `channels.matrix.rooms` with:
  - enabled=true, allow=true, autoReply=true, requireMention=false (adjust if needed)
- Restart gateway:
  - `systemctl --user restart openclaw-gateway`

## 6) Record IDs
- Append mapping to `notes/matrix-spaces-and-rooms.md` (or a per-effort note)

## 7) Sanity check
- In each room, send “ping” and confirm the bot responds.
