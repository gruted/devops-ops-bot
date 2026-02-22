# Model Review Inventory

## Configured Models and Providers Inventory

Loaded configuration from `/home/gru/.openclaw/openclaw.json` and environment secrets from `/run/user/1001/openclaw/secrets.env`.

### Models Configured:
- openai/gpt-4.1-mini (alias: gpt-ops) - Primary model
- openai/gpt-5.2 (alias: gpt-heavy)
- openai/gpt-5-mini (alias: gpt-balanced)

### Available Secrets (Names Only, Redacted Values):
- OPENAI_API_KEY (used for OpenAI API authentication)
- OPENCLAW_GATEWAY_TOKEN
- MATRIX_HOMESERVER
- MATRIX_USER_ID
- MATRIX_ACCESS_TOKEN
- MATRIX_DEVICE_NAME

### Model Callability:
- The main model set for the system is `openai/gpt-4.1-mini` (gpt-ops alias).
- Additional aliases indicate presence of newer or heavier models like `gpt-heavy` (gpt-5.2) and `gpt-balanced` (gpt-5-mini) which are presumably available for use.
- Key OPENAI_API_KEY is available which is required for calling OpenAI models.

Summary: The system is currently configured to use multiple OpenAI GPT models with aliases for ease of reference, and the API key is present allowing actual callouts to these models. The primary model is gpt-4.1-mini by default.

---

Inventory list created and saved to this file for reference.