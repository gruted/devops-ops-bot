# Model Review - Available Models

## Available Now (Configured and Usable)
- openai/gpt-4.1-mini (alias: gpt-ops): Primary model for main sessions and subagents by default
- openai/gpt-5.2 (alias: gpt-heavy): High-capacity model for complex, interactive, or high-impact tasks
- openai/gpt-5-mini (alias: gpt-balanced): Balanced cost and capability model for subagent fallback and moderate tasks

All these models are callable with the current OpenAI API key present in the environment.

## Supported by OpenClaw (catalog) vs usable on this host

OpenClaw ships with a **large built-in model/provider catalog** (you can see it via `openclaw models list --all`). That includes providers like Anthropic, Google Gemini, OpenRouter, Groq, Bedrock, etc.

However, **usable right now** depends on credentials and/or local runtimes.

### Usable right now (this host)
- OpenAI only (because `OPENAI_API_KEY` is present in the gateway runtime env)

### Potentially usable without an API key (requires local install/runtime)
- `ollama/*` **if** Ollama is installed and running locally (not currently installed/configured here).

### Usable with a login flow (no API key, but still requires auth)
- Google “Gemini CLI” / “Antigravity” providers can work via OAuth login flows (not currently set up here).

### Usable if we add keys
Examples (not exhaustive):
- `anthropic/*` via `ANTHROPIC_API_KEY` (or Claude setup-token)
- `google/*` via `GEMINI_API_KEY`
- `openrouter/*` via `OPENROUTER_API_KEY` (including OpenRouter free catalog)
- `groq/*` via `GROQ_API_KEY`

Current reality: we should design our cascade around the OpenAI trio today, and optionally add one “secondary provider” later for diversity/failover.

## Recommendations for Default/Fallback Cascade (OpenAI-only for now)
- **Default subagents:** `openai/gpt-5-mini` (best price/perf of what we have; also cheaper than 4.1-mini on output).
- **Default main (unless you explicitly want heavy):** `openai/gpt-5-mini`.
- **Heavy/upgrade:** `openai/gpt-5.2` when complexity/risk is high or you request it.
- **Keep `openai/gpt-4.1-mini` only as a compatibility/fallback option** for now (not as a default), until we’ve validated there’s no task class where it’s uniquely better.

## Summary
The current OpenClaw install supports a simple, tiered model strategy using OpenAI models keyed by available API credentials. This setup balances capability and cost effectively for interactive and background use cases.