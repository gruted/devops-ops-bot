#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { runCheck } = require('../lib/check');
const { formatResult } = require('../lib/format');
const { sendWebhook } = require('../lib/webhook');
const { tryRestart } = require('../lib/restart');

const program = new Command();

program
  .name('devops-watch')
  .description('MVP DevOps ops bot: collect host health metrics, evaluate thresholds, and alert/restart')
  .version('0.1.0');

program
  .command('check')
  .description('Run a single health check and exit non-zero if unhealthy')
  .option('--json', 'print JSON output')
  .option('--warn-cpu <pct>', 'warn if CPU load > pct (default: 85)', v => Number(v), 85)
  .option('--crit-cpu <pct>', 'critical if CPU load > pct (default: 95)', v => Number(v), 95)
  .option('--warn-mem <pct>', 'warn if memory used > pct (default: 85)', v => Number(v), 85)
  .option('--crit-mem <pct>', 'critical if memory used > pct (default: 95)', v => Number(v), 95)
  .option('--warn-disk <pct>', 'warn if root disk used > pct (default: 85)', v => Number(v), 85)
  .option('--crit-disk <pct>', 'critical if root disk used > pct (default: 95)', v => Number(v), 95)
  .option('--disk-mount <path>', 'disk mount to check (default: /)', '/')
  .option('--min-uptime-min <n>', 'critical if uptime < n minutes (default: 5)', v => Number(v), 5)
  .option('--webhook-url <url>', 'send alert to webhook (Slack/Discord-compatible)')
  .option('--restart-cmd <cmd>', 'shell command to run on critical (e.g. "systemctl restart nginx")')
  .option('--restart-on <level>', 'restart on: crit|warn|never (default: crit)', 'crit')
  .option('--tag <tag...>', 'tags to include in alerts (repeatable)')
  .option('--timeout-ms <n>', 'collection timeout ms (default: 4000)', v => Number(v), 4000)
  .action(async (opts) => {
    const result = await runCheck(opts);

    if (opts.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      process.stdout.write(formatResult(result) + '\n');
    }

    const shouldAlert = result.status !== 'ok';
    if (shouldAlert && opts.webhookUrl) {
      try {
        await sendWebhook({
          url: opts.webhookUrl,
          text: formatResult(result),
          json: { result }
        });
      } catch (e) {
        // webhook failures should not hide the health status
        process.stderr.write(`Webhook error: ${e.message || e}\n`);
      }
    }

    const restartOn = String(opts.restartOn || 'crit').toLowerCase();
    const canRestart = !!opts.restartCmd && restartOn !== 'never';
    const restartWanted =
      canRestart &&
      ((restartOn === 'crit' && result.status === 'crit') ||
        (restartOn === 'warn' && (result.status === 'warn' || result.status === 'crit')));

    if (restartWanted) {
      const rr = await tryRestart(opts.restartCmd);
      process.stdout.write(rr.message + '\n');
      if (opts.webhookUrl) {
        try {
          await sendWebhook({
            url: opts.webhookUrl,
            text: rr.message,
            json: { restart: rr, result }
          });
        } catch (e) {
          process.stderr.write(`Webhook error (restart): ${e.message || e}\n`);
        }
      }
    }

    // Exit codes: 0 ok, 1 warn, 2 crit
    process.exit(result.status === 'ok' ? 0 : result.status === 'warn' ? 1 : 2);
  });

program
  .command('cron-example')
  .description('Print example crontab entries for running devops-watch')
  .option('--every-min <n>', 'interval in minutes (default: 5)', v => Number(v), 5)
  .action((opts) => {
    const n = opts.everyMin;
    const line = `*/${n} * * * * /usr/bin/env node $(which devops-watch) check --webhook-url "$WEBHOOK" --restart-cmd "systemctl restart nginx"`;
    process.stdout.write('# Example (edit paths as needed):\n');
    process.stdout.write(`# WEBHOOK="https://hooks.slack.com/services/..."\n`);
    process.stdout.write(line + '\n');
  });

program.parseAsync(process.argv);
