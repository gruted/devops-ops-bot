#!/usr/bin/env node
/*
Create a Matrix Space + standard rooms for a new effort.
Usage:
  MATRIX_HOMESERVER=... MATRIX_ACCESS_TOKEN=... node matrix-create-effort.js "Effort Name" "@ted:server"

Creates:
  Space: <Effort Name>
  Rooms: announcements, workshop, alerts (private, unencrypted)
Links rooms into space and invites Ted everywhere.
Prints and writes mapping JSON/MD (no secrets).
*/

const fs = require('fs');

const HS = process.env.MATRIX_HOMESERVER;
const TOKEN = process.env.MATRIX_ACCESS_TOKEN;
const effortName = process.argv[2];
const tedMxid = process.argv[3] || '@ted:matrix.gruted.us.com';

if (!HS || !TOKEN) {
  console.error('Missing MATRIX_HOMESERVER or MATRIX_ACCESS_TOKEN in env');
  process.exit(2);
}
if (!effortName) {
  console.error('Usage: matrix-create-effort.js "Effort Name" [@ted:server]');
  process.exit(2);
}

async function mx(path, { method = 'GET', body } = {}) {
  const url = `${HS.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${text}`);
  }
  return data;
}

async function createRoom(name, { topic, isSpace = false } = {}) {
  const body = {
    name,
    topic: topic || '',
    preset: 'private_chat',
    visibility: 'private',
    is_direct: false,
    initial_state: [],
  };
  if (isSpace) {
    body.creation_content = { type: 'm.space' };
    body.initial_state.push({
      type: 'm.room.history_visibility',
      state_key: '',
      content: { history_visibility: 'shared' },
    });
  }
  const out = await mx('/_matrix/client/v3/createRoom', { method: 'POST', body });
  return out.room_id;
}

async function invite(roomId, userId) {
  await mx(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
    method: 'POST',
    body: { user_id: userId },
  });
}

async function linkChild(spaceId, childRoomId, via = ['matrix.gruted.us.com']) {
  await mx(`/_matrix/client/v3/rooms/${encodeURIComponent(spaceId)}/state/m.space.child/${encodeURIComponent(childRoomId)}`,
    { method: 'PUT', body: { via } });
  await mx(`/_matrix/client/v3/rooms/${encodeURIComponent(childRoomId)}/state/m.space.parent/${encodeURIComponent(spaceId)}`,
    { method: 'PUT', body: { via, canonical: true } });
}

(async () => {
  const spaceId = await createRoom(effortName, { isSpace: true, topic: `${effortName} (Space)` });
  await invite(spaceId, tedMxid);

  const rooms = {
    announcements: await createRoom(`${effortName} — announcements`, { topic: `${effortName}: status-only updates` }),
    workshop: await createRoom(`${effortName} — workshop`, { topic: `${effortName}: day-to-day work thread` }),
    alerts: await createRoom(`${effortName} — alerts`, { topic: `${effortName}: automations / monitoring` }),
  };

  for (const rid of Object.values(rooms)) {
    await linkChild(spaceId, rid);
    await invite(rid, tedMxid);
  }

  const result = { homeserver: HS, effort: effortName, ted: tedMxid, spaceId, rooms };

  const slug = effortName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const outJson = `/home/gru/.openclaw/workspace/notes/matrix-effort-${slug}.json`;
  const outMd = `/home/gru/.openclaw/workspace/notes/matrix-effort-${slug}.md`;

  fs.writeFileSync(outJson, JSON.stringify(result, null, 2));
  fs.writeFileSync(outMd,
`# Matrix effort space: ${effortName}

Homeserver: ${HS}

- Space ID: \`${spaceId}\`
- Rooms:
  - announcements: \`${rooms.announcements}\`
  - workshop: \`${rooms.workshop}\`
  - alerts: \`${rooms.alerts}\`

Notes: private + unencrypted rooms for bot compatibility.\n`
  );

  console.log(JSON.stringify(result, null, 2));
  console.error(`Wrote: ${outJson}`);
  console.error(`Wrote: ${outMd}`);
})().catch(err => {
  console.error(err.stack || String(err));
  process.exit(1);
});
