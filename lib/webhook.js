'use strict';

// Slack incoming webhooks accept {text}; Discord accepts {content}.
// We'll send both, plus embed-like minimal JSON via a code block.

async function sendWebhook({ url, text, json }) {
  if (!url) throw new Error('missing webhook url');

  const payload = {
    text,
    content: text
  };

  // include details in a secondary field if provided
  if (json) {
    const detail = '```json\n' + JSON.stringify(json, null, 2) + '\n```';
    payload.text = text + '\n' + detail;
    payload.content = text + '\n' + detail;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`webhook http ${res.status}: ${body.slice(0, 300)}`);
  }

  return true;
}

module.exports = { sendWebhook };
