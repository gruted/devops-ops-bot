Model & Cost Policy (OpenAI-only, draft)

Purpose
- Provide a concise, operational policy that balances capability and cost for interactive main sessions and short-lived background subagents.
- Keep main session responsive and high-capability when requested; keep subagents and routine tooling on cheaper models by default.

Scope
- Applies to OpenClaw-run AI calls using OpenAI models in this workspace. Future providers may map to equivalent tiers.

Policy summary
- Main session (interactive): by default run on the most capable model that Ted requests. The main session may use higher-cost models for long-form reasoning or when Ted explicitly asks for the "most capable" model.
- Subagents / background jobs: default to a lower-cost, smaller model ("subagent model") unless upgrade criteria (below) are met. Subagents must be configured to return concise, result-only summaries and write state to files, not long in-chat threads.
- Tool-driven ops (short automated runs that primarily call tools like exec/read/edit): prefer the cheapest model that reliably drives the toolchain. These should default to the same subagent model unless they meet upgrade criteria.

Suggested model tiers (examples)
- "High-capability": use only on main-session when requested or approved (examples: GPT-4o, GPT-4.x family). Reserve for interactive, high-ambiguity, or lengthy reasoning tasks.
- "Subagent/Default": use for subagents and routine ops (examples: GPT-4.1-mini / gpt-4o-mini / gpt-4-mini). Choose the cheapest model that meets functional needs.
- "Tool-only/Lowest": for trivial parsing, templating, or short-format tasks consider the lowest-cost model available (GPT-3.5-class equivalents).

Upgrade criteria (when a subagent or cheap model should use a heavier model)
- Repeated failures: task fails to meet correctness after 2–3 cheap-model iterations.
- Complexity threshold: task requires deep multi-step reasoning or long-context (> ~5k tokens) where cheaper models lose quality.
- Risk/impact: security, legal, financial, safety-critical, or policy-sensitive tasks.
- Explicit request: Ted (or an authorized approver) requests higher-capability model for a given run.
- Investigation/forensics: when accuracy and nuance are essential.

Cost guardrails & operational rules
- Default token budget per subagent job: configurable; start with 10k tokens/day per subagent project, adjustable after monitoring.
- Require an explicit flag (e.g., `use_high_capability: true`) and a brief justification in task metadata to upgrade models for subagents.
- Log model choices and token usage per task into workspace billing/log files for periodic review.
- Keep main-session messages short; store state in files (STATE.md / TASKS.md / notes/) rather than long chat history.

Implementation & enforcement
- Add model selection fields to subagent task templates and CI hooks that enforce default model usage.
- Require owner approval (Ted or designated approver) for recurring high-cost jobs.
- Review this policy quarterly or after any unusual billing event.

Location
- Draft saved: notes/model-policy.md

Notes
- This is a concise operational draft. Final approval and exact model names should be decided by Ted; this file documents the decision rules and where to change defaults.
