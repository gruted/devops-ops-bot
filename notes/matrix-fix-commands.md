# Matrix Room Allowlist Change Application Commands

## Summary
The Matrix room allowlist change was made in `~/.openclaw/openclaw.json` by adding the room:

```
!TxGKabgOjbl3DlSt8WRBm5frOhj8JvlgS5hQNd8kgUo
```

with these attributes:
- enabled: true
- allow: true

## Recommended Minimal Commands for Ted

1. Validate the JSON configuration:
```bash
jq empty ~/.openclaw/openclaw.json
```

2. Show the diff if a backup exists, or grep the new room line:
```bash
# If backup exists:
diff -u ~/.openclaw/openclaw.json~ ~/.openclaw/openclaw.json || true

# Or search directly for the new room entry:
grep '!TxG' ~/.openclaw/openclaw.json
```

3. Check if restart is needed to apply changes.

### If restart requires enabling `commands.restart=true`:

- Create a patch file (`config.patch`) to enable the restart command setting:

```patch
--- ~/.openclaw/openclaw.json
+++ ~/.openclaw/openclaw.json
@@ -30,6 +30,9 @@
+  "commands": {
+    "restart": true
+  }
```

- Apply the patch by editing the JSON or merging safely.

- Restart the matrix plugin or OpenClaw service:

```bash
# Restart matrix plugin or full OpenClaw if needed
openclaw gateway restart
```

- Rollback:

If issues occur, revert by removing or disabling `commands.restart`:

```patch
--- ~/.openclaw/openclaw.json
+++ ~/.openclaw/openclaw.json
@@ -30,9 +30,6 @@
-  "commands": {
-    "restart": true
-  }
```

and restart again.

## Notes
- No backup file `~/.openclaw/openclaw.json~` was found for diff.
- Ensure any restart commands are confirmed safe with the current setup.

---

This file documents safe, minimal steps to apply the Matrix room allowlist change.