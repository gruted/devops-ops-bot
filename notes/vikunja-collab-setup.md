# Vikunja collaboration setup (Ted + gru)

Date: 2026-02-06

Goal
- Create a Vikunja user `gru` so Ted can assign tasks and see progress.
- Create a shared Kanban project `OpenClaw Ops` with buckets:
  - Backlog / Ready / In Progress / Blocked / Done
- Seed initial tasks from `reports/vikunja-migration-plan.md`.
- Ensure Ted + gru can assign tasks to each other.

## What was done (no secrets)

### 1) Bitwarden Secrets Manager (SM)
Project: `openclaw-prod` (`51ba57e6-de28-47ef-82ec-b3e9012ec71a`)
- Created secret key: `GRU_VIKUNJA` (random password; value not logged).
- Created secret key: `VIKUNJA_TED_API_TOKEN` (JWT token obtained via API login as `ted`; value not logged).

### 2) Vikunja user `gru`
- Created local Vikunja user:
  - username: `gru`
  - email: `gru.ops@gmail.com`
  - password: from Bitwarden SM key `GRU_VIKUNJA`

Command reference (run on host; no secrets shown here):
```bash
sudo docker exec vikunja ./vikunja user list
sudo docker exec vikunja ./vikunja user create -u gru -e gru.ops@gmail.com -p "<from Bitwarden SM GRU_VIKUNJA>"
# If the user already exists:
sudo docker exec vikunja ./vikunja user reset-password <user-id> --direct -p "<from Bitwarden SM GRU_VIKUNJA>"
```

### 3) Ted API token
- Used `POST /api/v1/login` with `ted` + Bitwarden SM key `TED_VIKUNJA` to obtain a JWT.
- Stored as Bitwarden SM key `VIKUNJA_TED_API_TOKEN`.

### 4) Project + Kanban buckets
- Created project: `OpenClaw Ops` (project id: `3`).
- Verified default views include a Kanban view (view id: `12`).
- Updated Kanban buckets to:
  - `Backlog` (bucket id: `7`)
  - `Ready` (bucket id: `8`)
  - `In Progress` (bucket id: `10`)
  - `Blocked` (bucket id: `11`)
  - `Done` (bucket id: `9`)
- Updated Kanban view to set:
  - `default_bucket_id = 7` (Backlog)
  - `done_bucket_id = 9` (Done)

Notes:
- Vikunja on this host uses **PUT** for creates on several endpoints (e.g., `PUT /api/v1/projects`, `PUT /api/v1/projects/{id}/tasks`, `PUT /api/v1/projects/{id}/views/{id}/buckets`).
- Updating a view via `POST /api/v1/projects/{projectId}/views/{viewId}` required including a non-empty `title`.

### 5) Share project with `gru`
- Shared project `OpenClaw Ops` with user `gru` via:
  - `PUT /api/v1/projects/3/users` with JSON `{ "username": "gru", "right": 1 }`

### 6) Seed initial tasks
Created in project `OpenClaw Ops`:
- Task 1 (id: `1`): Investigate prior plan/changes to OpenClaw core re: `NEXT_SESSION` parsing (assigned to `gru`).
- Task 2 (id: `2`): Recover / establish access to `gru.ops@gmail.com` (assigned to `ted`).
- Task 3 (id: `3`): Test `/ledger_checkpoint` output size/format compliance (assigned to `gru`).

### Known issue observed
- `GET /api/v1/tasks/{id}/assignees` currently returns HTTP 500 (Internal Server Error) on this instance, even though:
  - adding assignees via `PUT /api/v1/tasks/{id}/assignees` works, and
  - removing via `DELETE /api/v1/tasks/{id}/assignees/{userId}` works.

If we need to debug: check Vikunja API logs inside the `vikunja` container around the assignees handler.

## Quick API snippets (safe templates)
```bash
BASE_URL="https://tasks.gruted.us.com"
TOKEN="<from Bitwarden SM VIKUNJA_TED_API_TOKEN>"

# list projects
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/projects"

# list kanban buckets
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/projects/3/views/12/buckets"

# share project with user
curl -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"gru","right":1}' \
  "$BASE_URL/api/v1/projects/3/users"
```
