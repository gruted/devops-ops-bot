'use strict';

const si = require('systeminformation');

function pct(n) {
  return Math.round(n * 10) / 10;
}

function levelFrom(value, warn, crit) {
  if (value >= crit) return 'crit';
  if (value >= warn) return 'warn';
  return 'ok';
}

async function withTimeout(promise, timeoutMs) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function runCheck(opts = {}) {
  const startedAt = new Date().toISOString();
  const timeoutMs = Number(opts.timeoutMs || 4000);

  // Parallel collection
  const [
    time,
    osInfo,
    load,
    mem,
    fs,
    cpuTemp
  ] = await withTimeout(
    Promise.all([
      si.time(),
      si.osInfo(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpuTemperature().catch(() => null)
    ]),
    timeoutMs
  );

  const mount = opts.diskMount || '/';
  const diskRow = (fs || []).find(r => r.mount === mount) || (fs || [])[0] || null;

  const cpuLoadPct = pct(load.currentLoad);
  const memUsedPct = pct((mem.used / mem.total) * 100);
  const diskUsedPct = diskRow ? pct((diskRow.used / diskRow.size) * 100) : null;
  const uptimeSec = Number(time.uptime || 0);
  const uptimeMin = Math.floor(uptimeSec / 60);

  const cpuLevel = levelFrom(cpuLoadPct, opts.warnCpu, opts.critCpu);
  const memLevel = levelFrom(memUsedPct, opts.warnMem, opts.critMem);
  const diskLevel = diskUsedPct == null ? 'warn' : levelFrom(diskUsedPct, opts.warnDisk, opts.critDisk);
  const uptimeLevel = uptimeMin < Number(opts.minUptimeMin || 5) ? 'crit' : 'ok';

  const levels = [cpuLevel, memLevel, diskLevel, uptimeLevel];
  const status = levels.includes('crit') ? 'crit' : levels.includes('warn') ? 'warn' : 'ok';

  const tags = Array.isArray(opts.tag) ? opts.tag : opts.tag ? [opts.tag] : [];

  const result = {
    startedAt,
    status,
    host: {
      hostname: osInfo.hostname,
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release
    },
    metrics: {
      cpu: {
        loadPct: cpuLoadPct,
        tempC: cpuTemp && typeof cpuTemp.main === 'number' ? pct(cpuTemp.main) : null,
        level: cpuLevel,
        warn: opts.warnCpu,
        crit: opts.critCpu
      },
      mem: {
        usedPct: memUsedPct,
        usedBytes: mem.used,
        totalBytes: mem.total,
        level: memLevel,
        warn: opts.warnMem,
        crit: opts.critMem
      },
      disk: {
        mount,
        usedPct: diskUsedPct,
        usedBytes: diskRow ? diskRow.used : null,
        totalBytes: diskRow ? diskRow.size : null,
        fs: diskRow ? diskRow.fs : null,
        level: diskLevel,
        warn: opts.warnDisk,
        crit: opts.critDisk
      },
      uptime: {
        uptimeSec,
        uptimeMin,
        level: uptimeLevel,
        minUptimeMin: Number(opts.minUptimeMin || 5)
      }
    },
    tags
  };

  return result;
}

module.exports = { runCheck };
