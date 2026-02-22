# Model Review — Sub-agent lifetime (TTL / cleanup)

## What exists today (OpenClaw)
OpenClaw doesn’t use a single “subagent TTL” knob the way you might expect; instead it has **three** related mechanisms:

1) **Run timeout (kill switch)**
- `sessions_spawn.runTimeoutSeconds` aborts a sub-agent run after N seconds.
- Important: this **does not** delete/archive the session; it only stops the run.

2) **Session cleanup behavior (keep vs delete)**
- `sessions_spawn.cleanup`: `keep|delete` (default `keep`).
- `cleanup: "delete"` archives immediately after the announce step (transcript still preserved via rename).

3) **Auto-archive after N minutes**
- `agents.defaults.subagents.archiveAfterMinutes` controls when completed sub-agent sessions are archived.
- Default per docs: **60 minutes**.
- Caveat: auto-archive is **best-effort** and relies on in-memory timers; **gateway restarts lose pending timers**, so sessions may stick around longer than expected.

Source: OpenClaw docs `docs/tools/subagents.md`.

## Recommended policy (effort horizon driven)
- For short-lived “one-shot” tasks: use `cleanup: "delete"` so completed sub-agent sessions don’t accumulate.
- For multi-hour/day efforts where we may want to inspect transcripts: keep `cleanup: "keep"`, but set `archiveAfterMinutes` to a value matching the effort’s horizon (e.g., 24h) so we can still review for a while.
- For truly long-running investigations: prefer *explicitly* keeping the session and promoting outputs into workspace artifacts; don’t rely on sessions as storage.

## What we should do next in this effort
1) Decide our default subagent model (likely `openai/gpt-5-mini`) and set it in config.
2) Set `agents.defaults.subagents.archiveAfterMinutes` to something sane (suggest **240** minutes by default; bump per effort if needed).
3) For expensive/complex subagents, explicitly set:
   - `runTimeoutSeconds` (avoid runaway)
   - `cleanup` (`keep` for debugging; `delete` for routine jobs)

## Notes on “remove TTL entirely”
The closest analogue would be setting `archiveAfterMinutes` very high (or effectively disabling auto-archive if supported), but the safer pattern is:
- keep the archive mechanism,
- extend it per effort when needed,
- and make sure anything important is written to files (`notes/`, `STATE.md`, `TASKS.md`).
