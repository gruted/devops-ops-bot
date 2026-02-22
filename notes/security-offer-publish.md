# Publish plan — Security review offering

Decision (default)
- Publish under: `https://gruted.us.com/security/`
- Rationale: Ted said “don’t care”; pick a stable default under the main domain.

What’s ready
- Static bundle prepared at: `site/security/`
  - `index.html`
  - `offering.md`
  - `sales-kit.md`
  - `sample-finding.md`
  - `sample-exec-summary.md`

Blocking constraint
- This chat/runtime cannot run privileged `sudo` reliably (no TTY), so I cannot:
  - read/modify `/etc/caddy/Caddyfile`
  - copy files into a root-owned web root
  - reload Caddy

Operator action (Ted) — minimal
- Run the following on the VPS in a real shell with sudo:

```bash
# 1) copy bundle to web root (adjust WEBROOT if needed)
WEBROOT=/var/www/html
sudo mkdir -p "$WEBROOT/security"
sudo rsync -a --delete /home/gru/.openclaw/workspace/site/security/ "$WEBROOT/security/"

# 2) update Caddy to serve /security (example; adjust site block)
sudoedit /etc/caddy/Caddyfile
# add something like:
# handle_path /security/* {
#   root * /var/www/html/security
#   file_server
# }

# 3) reload caddy
sudo systemctl reload caddy
```

Next step after publish
- Update the outreach templates to include the final URL.
