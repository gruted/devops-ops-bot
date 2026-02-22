# Substack draft upload/publish via curl (cookie-based)

These JSON payloads are ready:

- `ops_2026.json`
- `scaling_reliability.json`
- `secure_foundation.json`

Each includes `publication_id` + `draft_title` + `draft_subtitle` + `draft_body` (Substack ProseMirror JSON **string**).

## 0) Regenerate JSON after editing Markdown

If you edit any `*.md` source, re-generate its `draft_body` before uploading:

```bash
cd /home/gru/.openclaw/workspace
DOC=$(node scripts/md_to_substack_doc.js ops_2026.md)
jq --arg body "$DOC" '.draft_body=$body' ops_2026.json > ops_2026.json.tmp && mv ops_2026.json.tmp ops_2026.json
```

## 1) Get cookies (from a logged-in browser)

In DevTools → Application/Storage → Cookies (for `substack.com`), copy values for:

- `sid`
- `substack.sid`
- `substack.lli`

(If Substack sets additional CSRF headers/cookies in your session, keep them too.)

## 2) Find the exact internal endpoints (1-time)

Because Substack’s internal endpoints change, the reliable workflow is:

1. Open the Substack dashboard → create a *throwaway* draft manually.
2. In DevTools → Network, filter for `api/v1`.
3. Click the request that saved the draft.
4. “Copy as cURL”.

You’re looking for one of these patterns:

- Create draft: `POST https://<publication>.substack.com/api/v1/posts` (or similar)
- Update draft: `POST` or `PUT https://<publication>.substack.com/api/v1/posts/<id>`
- Publish: `POST https://<publication>.substack.com/api/v1/posts/<id>/publish`

## 3) curl template (create draft)

Replace `PUB_DOMAIN` + cookie values, and point `--data-binary` at one of the JSON files.

```bash
PUB_DOMAIN='https://YOURPUB.substack.com'
SID='...'
SUBSTACK_SID='...'
SUBSTACK_LLI='...'

curl "$PUB_DOMAIN/api/v1/posts" \
  -H 'accept: application/json' \
  -H 'content-type: application/json' \
  -H "cookie: sid=$SID; substack.sid=$SUBSTACK_SID; substack.lli=$SUBSTACK_LLI" \
  --data-binary @ops_2026.json
```

If create fails but update works, create an empty draft in the UI first, then use the update endpoint and pass the same JSON body.

## 4) curl template (publish)

Once you have the draft `id` (from the create response or from the URL `.../publish/post/<id>`):

```bash
POST_ID='123456'

curl -X POST "$PUB_DOMAIN/api/v1/posts/$POST_ID/publish" \
  -H 'accept: application/json' \
  -H 'content-type: application/json' \
  -H "cookie: sid=$SID; substack.sid=$SUBSTACK_SID; substack.lli=$SUBSTACK_LLI" \
  --data-binary '{"send_email":true,"audience":"everyone"}'
```

Notes:
- For “draft-only” publishing (no email), set `send_email:false`.
- If the publish endpoint expects different JSON keys, use the exact body from “Copy as cURL” and only edit values.

## 5) Troubleshooting

- `401/403`: cookies expired; refresh.
- `400`: usually malformed `draft_body` (empty text nodes, invalid types). Try removing empty lines in the Markdown and regenerate.
- `500`: endpoint mismatch; use the exact endpoint/method from DevTools.
