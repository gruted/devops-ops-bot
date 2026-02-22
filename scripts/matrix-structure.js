#!/usr/bin/env node
/*
Create Matrix Spaces + Rooms and invite Ted.
- Uses MATRIX_HOMESERVER + MATRIX_ACCESS_TOKEN from the environment.
- Does NOT print tokens.
*/

const fs = require('fs');

const HS = process.env.MATRIX_HOMESERVER;
const TOKEN = process.env.MATRIX_ACCESS_TOKEN;
const TED = process.env.TED_MXID || '@ted:matrix.gruted.us.com';

if (!HS || !TOKEN) {
  console.error('Missing MATRIX_HOMESERVER or MATRIX_ACCESS_TOKEN in env');
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
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${msg}`);
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
    body.initial_state.push({ type: 'm.room.history_visibility', state_key: '', content: { history_visibility: 'shared' } });
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
  // Add child to space
  await mx(`/_matrix/client/v3/rooms/${encodeURIComponent(spaceId)}/state/m.space.child/${encodeURIComponent(childRoomId)}`,
    { method: 'PUT', body: { via } });

  // Add parent to room (helps Element show the relationship)
  await mx(`/_matrix/client/v3/rooms/${encodeURIComponent(childRoomId)}/state/m.space.parent/${encodeURIComponent(spaceId)}`,
    { method: 'PUT', body: { via, canonical: true } });
}

async function main() {
  const plan = [
    {
      space: 'OpenClaw Ops',
      rooms: [
        { name: 'ops-announcements', topic: 'Ops announcements / status updates' },
        { name: 'ops-workshop', topic: 'Day-to-day OpenClaw ops work' },
        { name: 'ops-alerts', topic: 'Automations, monitoring, alerts' },
      ],
    },
    {
      space: 'Money / Biz Dev',
      rooms: [
        { name: 'ideas', topic: 'Raw ideas + brainstorming' },
        { name: 'research', topic: 'Links, research, competitive notes' },
        { name: 'pipeline', topic: 'Leads, outreach, next steps' },
      ],
    },
  ];

  const result = { homeserver: HS, ted: TED, spaces: {} };

  for (const s of plan) {
    const spaceId = await createRoom(s.space, { isSpace: true, topic: `${s.space} (Space)` });
    result.spaces[s.space] = { spaceId, rooms: {} };

    // Invite Ted to the space
    await invite(spaceId, TED);

    for (const r of s.rooms) {
      const roomId = await createRoom(r.name, { topic: r.topic });
      result.spaces[s.space].rooms[r.name] = roomId;

      // Link room under the space + invite Ted
      await linkChild(spaceId, roomId);
      await invite(roomId, TED);
    }
  }

  // Write mapping to workspace
  const outPath = '/home/gru/.openclaw/workspace/notes/matrix-spaces-and-rooms.json';
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  // Print mapping (non-secret)
  console.log(JSON.stringify(result, null, 2));
  console.error(`Wrote: ${outPath}`);
}

main().catch(err => {
  console.error(err.stack || String(err));
  process.exit(1);
});
