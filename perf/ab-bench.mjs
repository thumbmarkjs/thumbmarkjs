/**
 * A/B benchmark: measures two checkouts back to back under identical
 * conditions, which is the only way to read a delta on a machine that is
 * doing anything else. Chromium only, 1 warmup + 50 measured iterations each.
 *
 * Usage:
 *   node perf/ab-bench.mjs <labelA>=<pathA> <labelB>=<pathB>
 *
 * Each path is a checkout with a built dist/ (run `npm run build` in each
 * first). Example:
 *   git worktree add /tmp/tm-1110 v1.11.0 && (cd /tmp/tm-1110 && npm ci && npm run build)
 *   node perf/ab-bench.mjs v1.11.0=/tmp/tm-1110 HEAD=.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const ITER = 50;
const WARMUP = 1;
const PORT = 3334; // use 3334 to avoid conflicts

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('usage: node perf/ab-bench.mjs <labelA>=<pathA> <labelB>=<pathB>');
  console.error('   eg: node perf/ab-bench.mjs v1.11.0=/tmp/tm-1110 HEAD=.');
  process.exit(1);
}
const ROOTS = Object.fromEntries(args.map((a) => {
  const i = a.indexOf('=');
  if (i < 1) {
    console.error(`bad argument (expected label=path): ${a}`);
    process.exit(1);
  }
  const label = a.slice(0, i);
  const root = resolve(a.slice(i + 1));
  if (!existsSync(`${root}/dist/thumbmark.umd.js`)) {
    console.error(`${label}: no dist/thumbmark.umd.js under ${root} -- run \`npm run build\` there first`);
    process.exit(1);
  }
  return [label, root];
}));

const agg = (xs) => {
  const s = [...xs].sort((a,b) => a - b);
  const mean = xs.reduce((a,b) => a+b, 0) / xs.length;
  const median = s[Math.floor(s.length / 2)];
  const p95 = s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
  return { mean: +mean.toFixed(3), median: +median.toFixed(3), p95: +p95.toFixed(3) };
};

function startServer(root) {
  const mimeMap = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.map':'application/json' };
  const server = createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const filePath = root + urlPath;
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const mime = mimeMap[extname(filePath)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function runBench(label, root) {
  console.error(`\n=== Benchmarking ${label} from ${root} ===`);
  let server;
  let browser;
  try {
    server = await startServer(root);
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const URL = `http://localhost:${PORT}/perf/index.html`;
    await page.goto(URL);
    await page.waitForFunction(() => window.ThumbmarkJS && window.ThumbmarkJS.Thumbmark, { timeout: 30000 });

    const result = await page.evaluate(async ({ iter, warmup }) => {
      const TM = window.ThumbmarkJS;
      const tm = new TM.Thumbmark();
      const totals = [];
      const compMap = {};
      let perfFallback = false;

      // warmup
      for (let i = 0; i < warmup; i++) { await tm.get(); }

      for (let i = 0; i < iter; i++) {
        const t0 = performance.now();
        await tm.get();
        totals.push(performance.now() - t0);
        try {
          if (typeof TM.getFingerprintPerformance === 'function') {
            const p = await TM.getFingerprintPerformance();
            const el = (p && p.elapsed) || {};
            for (const k of Object.keys(el)) {
              if (typeof el[k] === 'number') (compMap[k] = compMap[k] || []).push(el[k]);
            }
          } else {
            perfFallback = true;
          }
        } catch(e) { perfFallback = true; }
      }
      return { totals, compMap, perfFallback };
    }, { iter: ITER, warmup: WARMUP });

    const totalAgg = agg(result.totals);
    const components = {};
    for (const k of Object.keys(result.compMap)) {
      const vals = result.compMap[k];
      components[k] = +(vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(3);
    }

    console.error(`  total mean=${totalAgg.mean}ms  p95=${totalAgg.p95}ms  fallback=${result.perfFallback}`);
    console.error(`  components: ${Object.keys(components).length}`);

    return { label, total_ms: totalAgg.mean, total_p95: totalAgg.p95, components, fallback: result.perfFallback };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore close-time errors */ }
    }
    if (server) {
      try { await new Promise((resolve) => server.close(resolve)); } catch (e) { /* ignore close-time errors */ }
    }
  }
}

async function main() {
  const results = {};

  for (const [label, root] of Object.entries(ROOTS)) {
    results[label] = await runBench(label, root);
  }

  writeFileSync('/tmp/tm-ab-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
