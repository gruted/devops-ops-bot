# 1Password Deprecation Audit Report

## Date
2026-02-19

## 1Password Data
- Accounts: 
  - Shorthand: openclaw-vps
  - URL: https://my.1password.com
  - Email: tedrebel@proton.me
  - User ID: 7FRGWJGDCZGSTFC6G4VH64YATE

- Vaults and Items: Unable to list due to no active session. Sign-in required, but master password not available to subagent.

## Bitwarden Secrets Manager Data
- Projects:
  - Name: openclaw-prod
  - ID: 51ba57e6-de28-47ef-82ec-b3e9012ec71a
  - Organization ID: da77fcb2-057b-454e-a02a-b3e9012d99ec

- Secrets (21):
  - OPENAI_API_KEY
  - OPENCLAW_GATEWAY_TOKEN
  - POSTGRES_PASSWORD
  - VIKUNJA_DATABASE_PASSWORD
  - VIKUNJA_SERVICE_JWTSECRET
  - matrix/prod/conduit_registration_token
  - matrix/prod/bot_openclaw_user_id
  - matrix/prod/bot_openclaw_password
  - TED_VIKUNJA
  - GRU_ELEMENT_PWD
  - matrix/prod/bot_openclaw_access_token
  - matrix/prod/bot_openclaw_device_id
  - MATRIX_HOMESERVER
  - MATRIX_USER_ID
  - MATRIX_ACCESS_TOKEN
  - MATRIX_DEVICE_NAME
  - GRU_VIKUNJA
  - VIKUNJA_TED_API_TOKEN
  - MATRIX_CONDUIT_REGISTRATION_TOKEN
  - MATRIX_BOT_PASSWORD
  - MATRIX_BOT_DEVICE_ID

## Comparison
Unable to perform full comparison due to lack of access to 1Password items.

## Migration
No migration performed. No unique items identified from 1Password.

## Confirmation
Cannot confirm no loss without access to 1Password data.

## Recommendations
- Provide master password or sign-in session to access 1Password for complete audit and migration.
- If all items are already in Bitwarden, proceed with deprecation.

