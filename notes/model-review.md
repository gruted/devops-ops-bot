
# Model Review (effort)

## Goal
Establish a clear, cost-aware **model selection policy** and an enforced **fallback cascade** so we consistently use the right model for the job (main + subagents), with predictable cost.

## Definition of done
- Inventory of **available models** we can use (providers + exact model IDs) and where they’re configured.
- For each model tier: rough **cost structure** and **capability notes** (what it’s good/bad at).
- A written **prioritization** and **fallback cascade** (by task type + risk level).
- Subagent defaults updated to match the policy; upgrades require an explicit justification.
- Subagent lifetime rules clarified:
  - what TTL/cleanup behavior is today,
  - what we want (per-effort horizon),
  - and the concrete config/process change to achieve it.

## Current state (known)
- Main session should run on the most capable model Ted requests.
- Subagents default cheaper unless upgrade criteria is met (draft policy exists in `notes/model-policy.md`).

## Work plan
1) Determine what models are configured/available right now in OpenClaw (`~/.openclaw/openclaw.json`) and any provider keys present.
2) Gather pricing + translate into tier guidance (see `notes/model-review-pricing.md`).
3) Produce a tier table (heavy/balanced/ops) with recommended task mappings + fallbacks.
4) Confirm how subagent cleanup/TTL works in OpenClaw (docs + config) and set an effort-horizon policy (see `notes/model-review-subagent-ttl.md`).
5) Update `notes/model-policy.md` (or replace with this doc as the canonical one) + update `STATE.md`/`TASKS.md`.

## Links
- Draft model/cost policy: `notes/model-policy.md`
- Money shortlist: `notes/money/shortlist.md`


## Inventory (added 2026-02-07)

- Configured models from `~/.openclaw/openclaw.json`:
  - openai/gpt-4.1-mini (alias: gpt-ops) as primary
  - openai/gpt-5.2 (alias: gpt-heavy)
  - openai/gpt-5-mini (alias: gpt-balanced)
- Relevant secrets present in `/run/user/1001/openclaw/secrets.env` (OpenAI API key and others)
- Models appear callable today with the available API key

Summary: The environment is set to use a tiered approach with a default primary model and options for heavier or balanced usage depending on task needs.
