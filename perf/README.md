# perf/ -- thumbmarkjs benchmarks

Runs Playwright timings of `Thumbmark.get()` and exposed component timings.

- `npm run perf` -- regression mode (chromium, 20 iter)
- `PERF_MODE=diagnose npm run perf` -- same iteration count as regression mode today (reserved for future hotspot ranking)
- `PERF_MODE=full npm run perf` -- chromium+firefox+webkit, 50 iter + warmup

Files:
- `perf/perf.spec.ts` -- Playwright spec
- `perf/index.html` -- loads `dist/thumbmark.umd.js`
- `perf/last-run.json` -- (gitignored) latest measurement
- `perf/baseline.json` -- committed baseline. Update ONLY after a reviewed optimization.
  Current file is from 2026-06-24 (pre-v1.11.0); its `speech` figure is known-noisy
  (cold-start variance, not a real regression) -- regenerate on a quiet machine
  before trusting it for a manual comparison.
- `perf/ab-bench.mjs` -- A/B two checkouts back to back under identical conditions.
  Prefer this over comparing a single run against `baseline.json` when the machine
  is busy, since absolute numbers drift but the delta holds:
  `node perf/ab-bench.mjs v1.11.0=/tmp/tm-1110 HEAD=.`
