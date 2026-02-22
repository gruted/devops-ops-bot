# Model Review — Anthropic pricing (quick compare)

Source: https://claude.com/pricing (fetched 2026-02-07)

## Latest models (standard, prompts ≤200K)
- **Haiku 4.5**: $1 / MTok input, $5 / MTok output
- **Sonnet 4.5**: $3 / MTok input, $15 / MTok output
- **Opus 4.6**: $5 / MTok input, $25 / MTok output

(Above 200K prompts: input/output step up; see source.)

## Compare to OpenAI (from https://openai.com/api/pricing/, fetched 2026-02-07)
- **GPT-5 mini**: $0.25 / MTok input, $2 / MTok output
- **GPT-5.2**: $1.75 / MTok input, $14 / MTok output

## Takeaways
- On pure token pricing, **OpenAI is cheaper** than Anthropic across these headline tiers.
  - Even Anthropic’s “cheap” Haiku output ($5/MTok) is >2× GPT‑5 mini output ($2/MTok).
- Anthropic may still be worth adding for **quality diversity + failover**, but it’s unlikely to win on cost alone.

