# Vikunja secrets (Bitwarden SM keys only)

Store these as **Bitwarden Secrets Manager** entries (exact key names below).

Required:
- `POSTGRES_PASSWORD`
- `VIKUNJA_DATABASE_PASSWORD`
- `VIKUNJA_SERVICE_JWTSECRET`

Optional (only if you want to manage via secrets/env instead of hardcoding non-secrets):
- `VIKUNJA_SERVICE_FRONTENDURL`  # e.g. https://tasks.gruted.us.com/
- `VIKUNJA_SERVICE_ENABLEREGISTRATION`  # true/false
- `VIKUNJA_MAILER_ENABLED`
- `VIKUNJA_MAILER_HOST`
- `VIKUNJA_MAILER_PORT`
- `VIKUNJA_MAILER_USERNAME`
- `VIKUNJA_MAILER_PASSWORD`
- `VIKUNJA_MAILER_FROMEMAIL`
