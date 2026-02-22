# Web / Browser Access Plan (non-secret)

Goal: make sure **gru** (OpenClaw) can reliably do browser/web UI work (logins, dashboards, admin panels, etc.) when needed — **without** affecting any desktop browser.

## Default approach (recommended)
- Use **VPS-local** OpenClaw-managed browser automation: `browser` tool with `profile="openclaw"`.
- Default to **headless + ephemeral sessions** (fresh profile per task).
- Only introduce persistence when explicitly needed for a site’s login state.

## Hard constraints / safety
- **Do not use Chrome Relay** (no desktop-attached browsing).
- Use a **domain allowlist** per task and **block navigation** outside it by default.
  - If a new domain is required, stop and request explicit approval.
- Browser hardening defaults:
  - block popups / new windows/tabs by default
  - disable notifications, geolocation, mic/cam
  - disable downloads unless explicitly needed (and then download to a per-task dir)
  - no extensions unless explicitly required (and then only in a dedicated profile)

## Architecture options (ranked)

### Option A (recommended): headless Chromium (Playwright-style) + ephemeral profiles
- Most deterministic and least “side effects”.
- Lowest attack surface (no GUI).
- Best default for unattended VPS work.

### Option B: headless Chromium + persistent per-site profiles
- Only when we need stable logins.
- **One profile per service/domain group** (never one global profile).
- Still enforce domain allowlist + “new domain needs confirmation”.

### Option C (escape hatch): headed Chromium under Xvfb + (no)VNC via SSH tunnel
- Only for sites hostile to headless or needing manual intervention.
- Never expose VNC/noVNC publicly; bind to localhost and tunnel.

## Operational checklist (validate browser tool works)
CLI:
1) `openclaw browser status`
2) `openclaw browser start`
3) `openclaw browser open https://example.com`
4) `openclaw browser screenshot --full-page <targetId>` (returns `MEDIA:<path>`)
5) `openclaw browser stop`

Tool API (agent):
1) `browser.status`
2) `browser.start` (profile openclaw)
3) `browser.open` / `browser.navigate`
4) `browser.snapshot` + `browser.screenshot`
5) `browser.stop`

Pass criteria: navigation succeeds, snapshot shows expected DOM, screenshot renders, and stop completes.

## Common VPS pitfalls / troubleshooting
- Missing deps/fonts → install Playwright/Chromium deps + `fonts-noto`.
- Small `/dev/shm` (containers) → increase shm or use `--disable-dev-shm-usage`.
- Sandbox issues (root/restricted containers) → run as non-root; avoid `--no-sandbox` unless unavoidable.
- DNS/egress restrictions or time skew → validate outbound connectivity + NTP.

## What we still need to decide
- Do we need **any** persistent login state? If yes, which sites, and are we okay with per-site persistent profiles on the VPS?
- Do we want to add **network-level allowlisting** (proxy/firewall) as a second layer of defense?
