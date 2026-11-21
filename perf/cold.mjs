/**
 * Cold-start benchmark: how long does the FIRST `get()` on a page take?
 *
 * Most real use is a fresh page view, so the first call is what matters, and
 * the warm repeated calls in perf.spec.ts say nothing about it. Every sample
 * here is the first and only `get()` on its page, in a browser that has never
 * run the library before.
 *
 * Variants (per sample):
 *   noapi_total_ms      fresh browser process, no api_key
 *   api_total_ms        fresh browser process, api_key + mocked /thumbmark (200)
 *   api_send_ms         same run as api_total_ms: get() start -> fetch issued
 *   ctx_api_total_ms    new context in an already-running browser (secondary)
 *   ctx_api_send_ms     same run: get() start -> fetch issued (secondary)
 *
 * No network leaves the machine: the API call (including its CORS preflight)
 * and the collect beacon are answered by Playwright routes, and every other
 * non-localhost request is aborted.
 *
 * Usage:
 *   node perf/cold.mjs [--root <checkout>] [--samples N] [--update-baseline]
 * Env: PERF_COLD_SAMPLES (default 10), PERF_COLD_DEADLINE_S (default 600).
 * Exit code 1 when the verdict is FAIL.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { cpus, platform, arch, loadavg } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const METRICS = ['noapi_total_ms', 'api_total_ms', 'api_send_ms', 'ctx_api_total_ms', 'ctx_api_send_ms'];
/** Only these decide the verdict; the ctx_* metrics are informational. */
export const GATED = ['noapi_total_ms', 'api_total_ms', 'api_send_ms'];
/** WARN above max(warn_pct, warn_min_ms); FAIL above max(fail_pct, fail_min_ms). Regressions only. */
export const THRESHOLDS = { warn_pct: 5, warn_min_ms: 20, fail_pct: 10, fail_min_ms: 30 };

const LAUNCH_TIMEOUT_MS = 30_000;
const SAMPLE_TIMEOUT_MS = 60_000;
// The default (cross-origin) endpoint is used, so the preflight a real page view
// pays is part of the measurement; the mock answers it instantly.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
const apiOptions = () => ({ api_key: 'k', cache_api_call: false });
const PAGE = '<!doctype html><meta charset="utf-8"><script src="/dist/thumbmark.umd.js"></script>';

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// With ~10 samples the p95 is effectively the max; read it as "worst seen".
export const p95 = (xs) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * 0.95))];
export const summarize = (xs) => ({ median: +median(xs).toFixed(1), p95: +p95(xs).toFixed(1) });

const withTimeout = (p, ms, what) => {
  let t;
  const timer = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${what} timed out after ${ms} ms`)), ms); });
  return Promise.race([p, timer]).finally(() => clearTimeout(t));
};

/** Serves `<root>/dist/*` plus a bare page that loads the UMD build. */
function startServer(root) {
  const server = createServer((req, res) => {
    const path = req.url.split('?')[0];
    if (path === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGE); return; }
    const file = resolve(root + path);
    if (!path.startsWith('/dist/') || !file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** First and only get() on a fresh page. Returns { total, send } in ms. */
async function measure(browser, base, options) {
  const page = await browser.newPage();
  try {
    await page.route('**/*', (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (u.hostname === '127.0.0.1') return route.continue();
      // The API request is cross-origin and carries x-api-key, so the browser
      // sends a CORS preflight first; answer it like the real server does.
      if (u.pathname === '/thumbmark') {
        if (req.method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: CORS });
        }
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: CORS,
          // `collect` makes the library send its one-shot beacon, which is stubbed below.
          body: '{"thumbmark":"mock","visitorId":"v","collect":{}}',
        });
      }
      // Without this stub the beacon goes to the real collector and fails slowly.
      if (u.pathname === '/beacon') {
        return route.fulfill({ status: req.method() === 'OPTIONS' ? 204 : 200, headers: CORS, body: '' });
      }
      return route.abort();
    });
    await page.goto(base + '/');
    return await page.evaluate(async (options) => {
      let sentAt = null;
      const realFetch = window.fetch;
      window.fetch = function (input) {
        if (sentAt === null && String(input && input.url || input).includes('/thumbmark')) sentAt = performance.now();
        return realFetch.apply(this, arguments);
      };
      const tm = new window.ThumbmarkJS.Thumbmark(options);
      const t0 = performance.now();
      const result = await tm.get();
      const total = performance.now() - t0;
      return { total, send: sentAt === null ? null : sentAt - t0, mocked: result && result.thumbmark === 'mock' };
    }, options);
  } finally {
    await page.close().catch(() => {});
  }
}

async function freshBrowser(fn) {
  const browser = await chromium.launch({ timeout: LAUNCH_TIMEOUT_MS });
  try {
    return await withTimeout(fn(browser), SAMPLE_TIMEOUT_MS, 'cold sample');
  } finally {
    // Bounded so a wedged browser cannot stall the run; Playwright reaps any leftover process on exit.
    await withTimeout(browser.close(), 10_000, 'browser.close').catch(() => {});
  }
}

/**
 * Runs `samples` rounds. In each round every target gets one sample of every
 * variant, and the target order rotates between rounds, so slow drift in
 * machine speed lands on all targets equally.
 *
 * targets: [{ label, root, options? }]   (options are merged into Thumbmark options)
 * Returns { label: { n, values: { metric: number[] } } }
 */
export async function runCold({ targets, samples = 10, deadlineMs = 600_000, log = () => {} }) {
  const start = Date.now();
  const state = [];
  try {
    for (const t of targets) {
      const root = resolve(t.root);
      if (!existsSync(`${root}/dist/thumbmark.umd.js`)) throw new Error(`${t.label}: no dist/thumbmark.umd.js under ${root}; run \`npm run build\` there first`);
      const server = await startServer(root);
      const base = `http://127.0.0.1:${server.address().port}`;
      const warm = await chromium.launch({ timeout: LAUNCH_TIMEOUT_MS });
      // Pre-start the warm browser's helper processes; not part of any sample.
      await withTimeout((async () => { const p = await warm.newPage(); await p.goto(base + '/'); await p.close(); })(), SAMPLE_TIMEOUT_MS, 'warm-up');
      state.push({ ...t, server, base, warm, n: 0, values: Object.fromEntries(METRICS.map((m) => [m, []])) });
    }
    for (let i = 0; i < samples; i++) {
      if (Date.now() - start > deadlineMs) { log(`deadline hit after ${i} of ${samples} samples`); break; }
      for (let k = 0; k < state.length; k++) {
        const s = state[(k + i) % state.length];
        const opts = s.options || {};
        const noapi = await freshBrowser((b) => measure(b, s.base, { ...opts }));
        const api = await freshBrowser((b) => measure(b, s.base, { ...apiOptions(), ...opts }));
        const ctx = await withTimeout(measure(s.warm, s.base, { ...apiOptions(), ...opts }), SAMPLE_TIMEOUT_MS, 'warm-browser sample');
        if (!api.mocked || api.send === null) throw new Error(`${s.label}: API request was not issued or not answered by the mock`);
        s.values.noapi_total_ms.push(noapi.total);
        s.values.api_total_ms.push(api.total);
        s.values.api_send_ms.push(api.send);
        s.values.ctx_api_total_ms.push(ctx.total);
        s.values.ctx_api_send_ms.push(ctx.send);
        s.n++;
        log(`sample ${i + 1}/${samples} ${s.label}: noapi ${noapi.total.toFixed(0)} api ${api.total.toFixed(0)} send ${api.send.toFixed(0)} ctx ${ctx.total.toFixed(0)}`);
      }
    }
    const version = state.length ? state[0].warm.version() : null;
    return { chromium: version, results: Object.fromEntries(state.map((s) => [s.label, { n: s.n, values: s.values }])) };
  } finally {
    for (const s of state) {
      await s.warm.close().catch(() => {});
      s.server.close();
    }
  }
}

export const hostInfo = () => ({ platform: platform(), arch: arch(), cpu: cpus()[0]?.model, cores: cpus().length });
export const loadPerCore = () => +(loadavg()[0] / cpus().length).toFixed(2);

/** values -> { metric: { median, p95 } } */
export const summaries = (values) => Object.fromEntries(METRICS.map((m) => [m, summarize(values[m])]));

/**
 * Compares current medians with baseline.cold. Only regressions count.
 * A baseline recorded on a different CPU/OS cannot judge absolute numbers, so
 * there FAIL is downgraded to WARN (use ab-cold.mjs for a trustworthy check).
 */
export function coldVerdict(now, baseline, t = THRESHOLDS) {
  if (!baseline || !baseline.metrics) return { verdict: 'INITIAL', checks: [] };
  const checks = GATED.map((name) => {
    const b = baseline.metrics[name]?.median, c = now.metrics[name].median;
    if (!b) return { name, verdict: 'PASS' };
    const delta = c - b, pct = (delta / b) * 100;
    const verdict = delta > Math.max(b * t.fail_pct / 100, t.fail_min_ms) ? 'FAIL'
      : delta > Math.max(b * t.warn_pct / 100, t.warn_min_ms) ? 'WARN' : 'PASS';
    return { name, baseline_ms: b, now_ms: c, delta_ms: +delta.toFixed(1), delta_pct: +pct.toFixed(1), verdict };
  });
  let verdict = checks.some((c) => c.verdict === 'FAIL') ? 'FAIL' : checks.some((c) => c.verdict === 'WARN') ? 'WARN' : 'PASS';
  const h = baseline.host, here = hostInfo();
  const sameHost = h && h.platform === here.platform && h.arch === here.arch && h.cpu === here.cpu && h.cores === here.cores;
  const notes = [];
  if (!sameHost) {
    notes.push('baseline was recorded on a different host; absolute comparison is advisory only');
    if (verdict === 'FAIL') verdict = 'WARN';
  }
  return { verdict, checks, notes };
}

async function measureCold(root, n, deadlineMs, log) {
  const load_before = loadPerCore();
  const { chromium: version, results } = await runCold({ targets: [{ label: 'now', root }], samples: n, deadlineMs, log });
  const r = results.now;
  return {
    timestamp: new Date().toISOString(),
    samples: r.n,
    chromium: version,
    host: hostInfo(),
    load_per_core: load_before,
    metrics: summaries(r.values),
  };
}

/**
 * Full cold run for one checkout: measure, summarize, compare with baseline.
 * A WARN/FAIL is re-measured once and the lower median per metric wins: a real
 * regression survives that, a burst of host load does not.
 */
export async function coldCheck({ root = '.', samples, deadlineMs, baselinePath = 'perf/baseline.json', log } = {}) {
  const n = samples ?? (Number(process.env.PERF_COLD_SAMPLES) || 10);
  const deadline = deadlineMs ?? (Number(process.env.PERF_COLD_DEADLINE_S) || 600) * 1000;
  const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')).cold : undefined;
  const anomalies = [];
  let cold = await measureCold(root, n, deadline, log);
  let result = coldVerdict(cold, baseline);
  if (result.verdict === 'WARN' || result.verdict === 'FAIL') {
    log?.(`${result.verdict}: re-measuring once to rule out host noise`);
    const again = await measureCold(root, n, deadline, log);
    cold = { ...cold, samples: Math.min(cold.samples, again.samples), metrics: Object.fromEntries(METRICS.map((m) =>
      [m, again.metrics[m].median < cold.metrics[m].median ? again.metrics[m] : cold.metrics[m]])) };
    anomalies.push('first run was WARN/FAIL; reported medians are the best of two runs');
    result = coldVerdict(cold, baseline);
  }
  if (cold.samples < n) anomalies.push(`partial: ${cold.samples} of ${n} samples before the deadline`);
  // The load average is read before the run: the 1-minute average after it would include the benchmark itself.
  if (cold.load_per_core > 1) anomalies.push(`host was busy before the run (load per core ${cold.load_per_core}); numbers are unreliable`);
  return { cold, ...result, anomalies };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const out = await coldCheck({ root: arg('--root') || '.', samples: Number(arg('--samples')) || undefined, log: (m) => console.error(m) });
  if (process.argv.includes('--update-baseline')) {
    if (out.verdict === 'FAIL' || out.verdict === 'WARN' || out.anomalies.length) {
      console.error(`not updating baseline: verdict ${out.verdict}, anomalies: ${out.anomalies.join('; ') || 'none'}`);
    } else {
      const file = 'perf/baseline.json';
      const base = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
      writeFileSync(file, JSON.stringify({ ...base, cold: out.cold }, null, 2) + '\n');
      out.baseline_updated = true;
    }
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.verdict === 'FAIL' ? 1 : 0);
}
