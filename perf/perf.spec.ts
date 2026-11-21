import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { coldCheck } from './cold.mjs';

const MODE = process.env.PERF_MODE || 'regression';
const CFG: Record<string, { iter: number; warmup: number }> = {
  regression: { iter: 20, warmup: 0 },
  diagnose:   { iter: 20, warmup: 0 },
  full:       { iter: 50, warmup: 5 },
};
const { iter, warmup } = CFG[MODE] || CFG.regression;
// Port 3335: must match perf/playwright.perf.config.ts's webServer port.
// The root e2e suite (different content root) and ab-bench.mjs each own a
// different port. If this drifts from the config, the suite dies with
// ERR_CONNECTION_REFUSED.
const URL = 'http://localhost:3335/perf/index.html';

const agg = (xs: number[]) => {
  const s = [...xs].sort((a,b)=>a-b);
  const mean = xs.reduce((a,b)=>a+b,0)/xs.length;
  const median = s[Math.floor(s.length/2)];
  const p95 = s[Math.min(s.length-1, Math.floor(s.length*0.95))];
  return { mean: +mean.toFixed(3), median: +median.toFixed(3), p95: +p95.toFixed(3) };
};

async function runOne(page) {
  await page.goto(URL);
  await page.waitForFunction(() => (window as any).ThumbmarkJS?.Thumbmark);
  return await page.evaluate(async ({ iter, warmup }) => {
    const TM = (window as any).ThumbmarkJS;
    const tm = new TM.Thumbmark();
    const totals: number[] = [];
    const compMap: Record<string, number[]> = {};
    let perfFallback = false;
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
            if (typeof el[k] === 'number') (compMap[k] ||= []).push(el[k]);
          }
        } else {
          perfFallback = true;
        }
      } catch { perfFallback = true; }
    }
    return { totals, compMap, perfFallback };
  }, { iter, warmup });
}

const results: any = { mode: MODE, iterations: iter, timestamp: new Date().toISOString(), per_browser: {} };
// PERF_MODE=cold runs only the cold-start check below.
const browsers = MODE === 'cold' ? [] : MODE === 'full' ? ['chromium','firefox','webkit'] : ['chromium'];

for (const b of browsers) {
  test(`bench ${b}`, async ({ playwright }) => {
    const browser = await (playwright as any)[b].launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const { totals, compMap, perfFallback } = await runOne(page);
    await browser.close();
    const totalAgg = agg(totals);
    const components: Record<string, number> = {};
    for (const k of Object.keys(compMap)) components[k] = +(compMap[k].reduce((a,b)=>a+b,0)/compMap[k].length).toFixed(3);
    if (perfFallback || Object.keys(components).length === 0) {
      results.fallback = true;
    }
    results.per_browser[b] = { total_ms: totalAgg.mean, total_p95: totalAgg.p95, components };
    if (b === 'chromium') {
      results.total_ms = totalAgg.mean;
      results.total_p95 = totalAgg.p95;
      results.components = Object.keys(components).length ? components : { _total: totalAgg.mean };
    }
    expect(totals.length).toBe(iter);
  });
}

// Cold start: the first get() in a brand-new browser process, which is what a
// real page view pays. Runs in every mode; see perf/cold.mjs for the variants
// and thresholds. FAIL fails the suite; WARN is reported but passes.
test('cold start', async () => {
  test.setTimeout(2 * (Number(process.env.PERF_COLD_DEADLINE_S) || 600) * 1000 + 120_000);
  const r = await coldCheck({ log: (m) => console.log(`[cold] ${m}`) });
  results.cold = r.cold;
  results.cold_verdict = { verdict: r.verdict, checks: r.checks, notes: r.notes, anomalies: r.anomalies };
  console.log(`[cold] ${r.verdict}\n${JSON.stringify(r.cold.metrics, null, 2)}\n${JSON.stringify(r.checks)}`);
  if (r.verdict === 'WARN') test.info().annotations.push({ type: 'cold-start WARN', description: JSON.stringify(r.checks) });
  expect(r.verdict, `cold-start regression: ${JSON.stringify(r.checks)}`).not.toBe('FAIL');
});

test.afterAll(() => {
  if (MODE === 'cold') {
    // Kept apart from last-run.json so a cold-only run can never be copied over
    // the warm baseline by mistake.
    writeFileSync('perf/last-cold.json', JSON.stringify(results, null, 2));
    return;
  }
  if (MODE !== 'full') delete (results as any).per_browser;
  writeFileSync('perf/last-run.json', JSON.stringify(results, null, 2));
});
