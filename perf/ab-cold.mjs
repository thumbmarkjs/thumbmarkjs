/**
 * Cold-start A/B: compares the first-`get()` time of two or more checkouts,
 * interleaved sample by sample (fresh browser process per sample), so machine
 * drift hits every arm equally. See perf/cold.mjs for the variants measured.
 *
 * Usage:
 *   node perf/ab-cold.mjs <label>=<path> <label>=<path> [...] [--samples N] [--opts <label>=<json>]
 *
 * Each path needs a built dist/. Reported deltas are relative to the first arm.
 * `--opts` adds Thumbmark options to one arm, e.g.
 *   node perf/ab-cold.mjs a=. b=. --opts 'b={"logging":false}'
 * Observations are always on, so to measure their cost compare against a
 * checkout that predates them (e.g. a v1.12.0 worktree):
 *   node perf/ab-cold.mjs v1120=<path> main=.
 * An A/A run (same path twice) shows the noise floor:
 *   node perf/ab-cold.mjs a=. b=.
 */
import { runCold, summaries, METRICS, loadPerCore } from './cold.mjs';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (name) => { const out = []; for (let i = 0; i < argv.length; i++) if (argv[i] === name) out.push(argv[i + 1]); return out; };
const samples = Number(flag('--samples')[0]) || Number(process.env.PERF_COLD_SAMPLES) || 10;
const opts = Object.fromEntries(flag('--opts').map((o) => { const i = o.indexOf('='); return [o.slice(0, i), JSON.parse(o.slice(i + 1))]; }));
const arms = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--') && a.includes('='));
if (arms.length < 2) {
  console.error('usage: node perf/ab-cold.mjs <label>=<path> <label>=<path> [--samples N] [--opts <label>=<json>]');
  process.exit(1);
}
const targets = arms.map((a) => { const i = a.indexOf('='); const label = a.slice(0, i); return { label, root: a.slice(i + 1), options: opts[label] }; });

const load = loadPerCore();
const { results } = await runCold({ targets, samples, log: (m) => console.error(m) });
const sum = Object.fromEntries(Object.entries(results).map(([l, r]) => [l, summaries(r.values)]));

const first = targets[0].label;
console.log(`\nmedian ms (p95 ms) over ${samples} samples; delta vs ${first}; host load per core before run: ${load}\n`);
console.log(['metric'.padEnd(18), ...targets.map((t) => t.label.padStart(22))].join(' '));
for (const m of METRICS) {
  const row = targets.map((t) => {
    const s = sum[t.label][m], b = sum[first][m].median;
    const d = t.label === first ? '' : ` ${s.median - b >= 0 ? '+' : ''}${(s.median - b).toFixed(0)}`;
    return `${s.median.toFixed(0)} (${s.p95.toFixed(0)})${d}`.padStart(22);
  });
  console.log([m.padEnd(18), ...row].join(' '));
}
writeFileSync(process.env.PERF_COLD_AB_OUT || 'perf/last-ab-cold.json', JSON.stringify({ samples, arms: results, summary: sum }, null, 2));
