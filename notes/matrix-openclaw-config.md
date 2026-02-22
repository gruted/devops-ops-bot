# OpenClaw Matrix config: duplicate plugin id warning

## Symptom
OpenClaw CLI printed repeatedly:

- `plugins.entries.matrix: plugin matrix: duplicate plugin id detected; later plugin may be overridden (.../openclaw/extensions/matrix/index.ts)`

Matrix still worked, but the warning was noisy and hinted at ambiguous plugin selection.

## Root cause
OpenClaw was discovering **two** Matrix plugins with the same manifest id (`matrix`):

1. A user-installed extension under `~/.openclaw/extensions/matrix` (had its own deps and was the one actually making Matrix work).
2. A **bundled** extension inside the OpenClaw npm install at `.../lib/node_modules/openclaw/extensions/matrix`.

Because both had `id: "matrix"`, the manifest registry warned about a duplicate id.

## Fix applied (minimal + keeps Matrix working)
Goal: end up with **one** Matrix plugin candidate.

1. Removed the user-installed plugin directory from discovery:
   - moved `~/.openclaw/extensions/matrix` out of the extensions directory (saved under `~/.openclaw/workspace/backups/`).
2. The bundled Matrix plugin initially failed to load due to a missing dependency, so we installed it into the OpenClaw package:
   - `cd ~/.npm-global/lib/node_modules/openclaw && npm install @vector-im/matrix-bot-sdk@latest`

After that:
- `openclaw status` no longer emits the duplicate plugin id warning.
- A test message sent via Matrix succeeded.

## Notes / follow-ups
- This is effectively patching the installed OpenClaw package’s dependencies. If OpenClaw is upgraded/reinstalled, this dependency may need to be rechecked.
- Consider setting `plugins.allow: ["matrix", ...]` once the desired plugin set is stable (security hardening).
