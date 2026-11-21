# perf/ -- thumbmarkjs benchmarks

Runs Playwright timings of `Thumbmark.get()` and exposed component timings.

- `npm run perf` -- regression mode (chromium, 20 iter) plus the cold-start check
- `PERF_MODE=diagnose npm run perf` -- same iteration count as regression mode today (reserved for future hotspot ranking)
- `PERF_MODE=full npm run perf` -- chromium+firefox+webkit, 50 iter + warmup, plus the cold-start check (chromium)
- `PERF_MODE=cold npm run perf` -- the cold-start check alone (about 1-2 minutes)

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

## Cold start

The warm benchmark calls `get()` repeatedly in one page. Real page views pay
the first call, so `perf/cold.mjs` measures that instead: every sample is the
first and only `get()` on its page, in a browser process that has never run the
library (`chromium.launch()` per sample, not a new context). No network is used:
the API call goes to the default cross-origin endpoint and is answered by a
Playwright route that also answers the CORS preflight (OPTIONS -> 204 with
`access-control-allow-origin/headers/methods`), so the preflight a real page
view pays is included. The collect beacon (`**/beacon`) is stubbed too; left
unstubbed it adds roughly 650 ms of artefact after the request. Everything else
off localhost is aborted.

| metric | what it is | gated |
|---|---|---|
| `noapi_total_ms` | first `get()`, no `api_key` | yes |
| `api_total_ms` | first `get()` with `api_key`, mocked `/thumbmark` 200 | yes |
| `api_send_ms` | `get()` start until the `/thumbmark` fetch is issued | yes |
| `ctx_api_*` | same, in a new context of an already running browser | no (informational) |

Gate (medians, regressions only, against `baseline.json` -> `cold`):
WARN above max(5%, 20 ms), FAIL above max(10%, 30 ms). A FAIL fails the suite;
a WARN is annotated. A WARN or FAIL is re-measured once and the lower median
wins, so a burst of host load does not fail the run. A baseline recorded on a
different CPU or OS cannot judge absolute numbers; there FAIL is downgraded to
WARN.

- `PERF_COLD_SAMPLES` (default 10) and `PERF_COLD_DEADLINE_S` (default 600, per
  measurement) bound the run. Every browser launch and sample has its own timeout.
- `node perf/cold.mjs` -- standalone run, prints JSON, exits 1 on FAIL.
- `node perf/cold.mjs --update-baseline` -- rewrites only the `cold` key of
  `baseline.json`; refused on WARN/FAIL or when the host was busy. Do it on a
  quiet machine (load per core well under 1).
- `node perf/ab-cold.mjs a=<path> b=<path> [--samples N]` -- compares checkouts
  cold, interleaved sample by sample, so drift cancels. Use it to confirm any
  WARN, and for hardware that differs from the baseline's. `--opts label=<json>`
  adds Thumbmark options to one arm, e.g. `--opts 'b={"logging":false}'`.
  Observations cannot be switched off, so to measure their cost compare against
  a checkout without them (e.g. a v1.12.0 worktree):
  `node perf/ab-cold.mjs v1120=<path> main=.`.
  `a=. b=.` shows the noise floor.
- `perf/last-cold.json` / `perf/last-ab-cold.json` -- (gitignored) latest cold results.

`api_total_ms` includes the browser's own first-fetch cost (about 300 ms in a
fresh process, near 0 in a warm one), which is noisier than the rest (about
+/-35 ms between identical runs); `api_send_ms` and `noapi_total_ms` are the
tightest signals (+/-10 ms).

In headless Chromium a cold first `get()` is about 950 ms, of which about 800 ms
is the `speech` component's voice-load timeout (headless has no voices). That is
baseline behaviour and is part of the baseline numbers, not a regression; the
gate only reacts to movement of the median. With a ~950 ms baseline, WARN
triggers at about +48 ms and FAIL at about +95 ms; the 20/30 ms floors only matter
for faster hosts.
