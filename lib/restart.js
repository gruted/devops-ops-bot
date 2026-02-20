'use strict';

const { exec } = require('node:child_process');

function tryRestart(cmd) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    exec(cmd, { timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          startedAt,
          cmd,
          code: typeof err.code === 'number' ? err.code : null,
          signal: err.signal || null,
          stdout: String(stdout || '').slice(0, 4000),
          stderr: String(stderr || '').slice(0, 4000),
          message: `[RESTART FAIL] cmd="${cmd}" code=${err.code ?? 'n/a'} ${String(stderr || err.message || '').trim()}`
        });
        return;
      }
      resolve({
        ok: true,
        startedAt,
        cmd,
        stdout: String(stdout || '').slice(0, 4000),
        stderr: String(stderr || '').slice(0, 4000),
        message: `[RESTART OK] cmd="${cmd}" ${String(stdout || '').trim()}`
      });
    });
  });
}

module.exports = { tryRestart };
