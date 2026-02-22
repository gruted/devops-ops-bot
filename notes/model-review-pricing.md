# Model Review — Pricing (OpenAI)

Source: https://openai.com/api/pricing/ (fetched 2026-02-07)

## Flagship models
- **GPT-5.2**
  - Input: **$1.75 / 1M tokens**
  - Cached input: **$0.175 / 1M tokens**
  - Output: **$14.00 / 1M tokens**

- **GPT-5 mini**
  - Input: **$0.25 / 1M tokens**
  - Cached input: **$0.025 / 1M tokens**
  - Output: **$2.00 / 1M tokens**

## GPT-4.1 family (noted on pricing page under fine-tuning section)
- **GPT-4.1 mini**
  - Input: **$0.80 / 1M tokens**
  - Cached input: **$0.20 / 1M tokens**
  - Output: **$3.20 / 1M tokens**

## Implications (quick)
- Output tokens dominate cost on GPT‑5.2 (14.00/M) — keep replies concise; avoid overlong deliberation in heavy mode.
- GPT‑5 mini is the best default “cheap but capable” tier in this set (0.25/M in, 2.00/M out).
- GPT‑4.1 mini output is pricier than GPT‑5 mini (3.20/M vs 2.00/M) per the pricing page figures; if quality is comparable for a task, GPT‑5 mini may be the better default.

## Next
- Confirm these are the exact model IDs we’re using via OpenClaw config (aliases: gpt-heavy/gpt-balanced/gpt-ops).
- Build a task→model cascade using these prices + observed reliability in our workflows.
