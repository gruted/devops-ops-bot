'use strict';

function humanBytes(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)}${units[i]}`;
}

function formatResult(r) {
  const m = r.metrics;
  const parts = [];
  parts.push(`[${r.status.toUpperCase()}] ${r.host.hostname}`);
  parts.push(`cpu=${m.cpu.loadPct}%(${m.cpu.level})`);
  parts.push(`mem=${m.mem.usedPct}%(${m.mem.level})`);
  parts.push(
    `disk(${m.disk.mount})=${m.disk.usedPct == null ? 'n/a' : m.disk.usedPct + '%'}(${m.disk.level})`
  );
  parts.push(`uptime=${m.uptime.uptimeMin}m(${m.uptime.level})`);
  if (m.cpu.tempC != null) parts.push(`temp=${m.cpu.tempC}C`);
  parts.push(
    `memBytes=${humanBytes(m.mem.usedBytes)}/${humanBytes(m.mem.totalBytes)}`
  );
  if (m.disk.usedBytes != null && m.disk.totalBytes != null) {
    parts.push(`diskBytes=${humanBytes(m.disk.usedBytes)}/${humanBytes(m.disk.totalBytes)}`);
  }
  if (r.tags && r.tags.length) parts.push(`tags=${r.tags.join(',')}`);
  return parts.join(' ');
}

module.exports = { formatResult };
