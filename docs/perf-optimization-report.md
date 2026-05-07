# Performance optimization report — May 2026

**Library version under investigation:** thumbmarkjs 1.8.1
**Test environment:** Chrome on macOS, throttled via Chrome DevTools CPU dropdown
**Session outcome:** `tm.get()` wall-clock at 20× CPU throttle dropped from
**1038 ms → 331 ms** (3.14× faster, −68%), with the produced fingerprint hash
**byte-identical to the published 1.8.1 release** on the same machine.

If you only read one paragraph: a single side-by-side run loaded the published
1.8.1 from jsDelivr in one Chrome tab and our optimized local 1.8.1 build in
the same tab via a query-string switch. Both produced thumbmark
`0ef8bdbc97de077c45a46358ecc4ba42`. The optimized build was 3× faster. Same
input, same output — the speedup came purely from removing wasted work.

## Headline numbers

All measurements: Chrome on macOS, **DevTools CPU at 20× slowdown**, 5 iterations
+ 1 warm-up. The 20× throttle is more aggressive than any real device but
makes bottlenecks unmissable; saving N ms there scales roughly linearly down to
unthrottled (~N/20 ms saving on a fast PC).

| | Published 1.8.1 (CDN) | Optimized local 1.8.1 | Δ |
|---|---:|---:|---:|
| TOTAL `tm.get()` wall-clock | **1038 ms** | **331 ms** | **−68%** |
| Reported library version | 1.8.1 | 1.8.1 | identical |
| **Thumbmark hash** | **`0ef8bdbc97de077c45a46358ecc4ba42`** | **`0ef8bdbc97de077c45a46358ecc4ba42`** | **identical** |
| Hash stable across iterations | ✓ | ✓ | both stable |

Scaled estimates (linear in throttle):
- Unthrottled fast PC: ~52 ms → ~17 ms.
- Mid-tier Android (4× / Moto G4 class, Lighthouse mobile default): ~210 ms → ~67 ms.
- Low-tier Android (6×): ~330 ms → ~100 ms.

156/156 Jest tests pass on every step of the chain. Nothing has been committed
yet; all changes live on the working tree awaiting review.

## Why this work was started

Initial inspection: `webrtc` was the slowest component on every measurement.
Reading the code revealed it spent most of its time waiting for the first
`icecandidate` event purely to capture a `candidateType` field that, with
`iceServers: []`, is *always* `'host'` — zero entropy in the fingerprint hash.
That motivated the broader question: where else is the library doing work that
doesn't contribute to the hash?

## Method

A self-contained perf harness lives in `test.html` (root of the repo) and was
extended over the session into a measurement tool with these properties:

1. **Source toggle.** A `?source=local|cdn` query param (also a dropdown in the
   page) decides whether to load `./dist/thumbmark.umd.js` or
   `https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js`.
   Same harness, swappable build — that's how the headline comparison above
   was generated.
2. **Per-iteration timing.** Wraps `await tm.get({ performance: true })` in
   `performance.now()` to capture wall-clock + the per-component `elapsed` map
   that `options.performance` exposes.
3. **Hash capture + stability check.** Captures `res.thumbmark` per iteration
   and flags any drift across the 5 iterations of a single run.
4. **Title-encoded payload.** After each run, encodes everything (source, version,
   total median/min/max, per-component medians, thumbmark hash, stability flag)
   into `document.title` as `__PERF__:{...json...}`. This let an external poller
   (a small AppleScript loop on macOS reading the active Chrome tab's title)
   capture results without needing CDP / chrome-devtools-MCP access. That made
   the round-trip "edit code → rebuild → reload → capture numbers" tight.
5. **CPU throttling via DevTools.** Performance panel → CPU dropdown → 4× / 6× /
   20×. Persists across reloads while DevTools stays open, so each round trip
   keeps the same throttle.

### Hash-stability discipline

Every measurement run captured the thumbmark hash. The session anchor was
`0ef8bdbc97de077c45a46358ecc4ba42` (the value the published 1.8.1 produces on
the test machine). Before each code change we re-captured the pre-change hash;
after each rebuild we re-captured the post-change hash. Any byte mismatch was
treated as an immediate revert. The harness's `stable: true` field also
confirmed *intra-run* hash stability across the 5 iterations.

### Diagnostic instrumentation

Beyond the user-facing per-component `elapsed`, we added two new families of
keys (gated on `options.performance` so they only show up for callers that
already opted into timing):

- `_pipeline.<phase>` — per-phase timings inside `getThumbmark`:
  `_pipeline.dispatch` (sync time of calling all 13 component functions),
  `_pipeline.resolve` (`await raceAllPerformance`), `_pipeline.filter`,
  `_pipeline.stringify`, `_pipeline.hash`, `_pipeline.assembly`.
- `_dispatch.<componentName>` — per-component sync-prelude timing. Captures how
  long each component's `async function` body runs *synchronously* before its
  first `await` yields. This was the key revelation of the session: most of the
  budget lived in component sync work, not in the post-component pipeline.

Both families are in `elapsed` only, never in `components`. The hash is computed
from `components`, so timing data has no effect on the fingerprint. Verified
empirically (hash unchanged before/after instrumentation landed).

## What we changed

Eight discrete changes, in the order they landed. Each was verified
hash-equivalent on the test machine before moving on.

### 1. `webrtc` — drop the ICE-candidate wait
`src/components/webrtc/index.ts`

The component called `createOffer` + `setLocalDescription`, regex-extracted
codec/extension/fmtp data from `offer.sdp`, and *additionally* waited up to
4500 ms for the first `icecandidate` event to capture `candidateType`. With
`iceServers: []`, every browser produces only host candidates →
`candidateType === 'host'` always → zero entropy in the hash. The wait was
~3-5 ms even when fast (host candidates fire quickly), but the timeout machinery
+ event listener + race wrapper was pure overhead.

We deleted the inner `Promise<componentInterface>` race, hardcoded
`candidateType: 'host'` in the result (preserves the hash for everyone who
previously hit the success path — virtually all users), and closed the
connection synchronously after extracting SDP data.

While in the file, fixed a pre-existing resource leak: if
`new RTCPeerConnection(config)` or `connection.createDataChannel('')` threw
synchronously, the outer catch couldn't safely call `connection.close()`
(`connection` was either in TDZ or assigned-but-never-closed). Moved the
declaration to a `let connection: RTCPeerConnection | undefined` outside the
try; added `connection?.close()` to the outer catch.

### 2. `raceAllPerformance` — clear the loser timer
`src/utils/raceAll.ts`

The pattern `Promise.race([component, delay(timeoutTime, timeoutVal)])` never
cleared the `setTimeout` when the component promise settled first. Each
`tm.get()` was leaking 13 timers (one per component, default 5000 ms each)
that ran to completion in the background. Repeated calls accumulated.

Refactored to track the timeout ID explicitly and `clearTimeout` it from the
component-side `.then` and `.catch`. Public API of `raceAllPerformance`,
`raceAll`, and `delay` are all unchanged. Existing `raceAll.test.ts` passes
without modification.

### 3. `getBrowser` — memoize
`src/components/system/browser.ts`

`getBrowser()` performs up to 12 sequential regex `.match()` calls on the user
agent. It's invoked by `getExcludeList`, which is called from
`filterThumbmarkData` and `resolveClientComponents` — at least twice per
`tm.get()`.

Added a module-scoped `Map<cacheKey, BrowserResult>` keyed on
`(navigator.brave ? 'B|' : 'N|') + navigator.userAgent`. The Brave prefix is
necessary because Brave masks its UA but reports a different `name` than the
underlying browser. Tests stay green: each test case mocks a distinct UA →
distinct cache key → no stale-cache bleed-through.

### 4. `stableStringify` — Set-based cycle detection
`src/utils/stableStringify.ts`

Cycle detection used `seen.indexOf(node)` on a `seen: any[]` array — O(N)
per visit, O(N²) over a full traversal. Fingerprint data is acyclic by
construction, so the check never trips, but it ran anyway on every node visit.

Replaced `seen` with `Set<any>`. `seen.has` (O(1)), `seen.add`, `seen.delete`.
The serialization logic — key sorting, value recursion, comma joining, brace
emission — is byte-identical. Output for any non-cyclic input is byte-identical.
Hash unchanged.

### 5. `audio` — remove `console.error`
`src/components/audio/index.ts`

`getAudio` had a stray `console.error('Error creating audio fingerprint:', error)`
in its error path. Public OSS libraries shouldn't write to the browser console
from their hot path. The next line `reject(error)` already routes the error
through `raceAllPerformance`'s structured error channel. Just deleted the line.

### 6. Pipeline + per-component instrumentation (diagnostic)
`src/functions/index.ts`

After (1)-(5) landed, the throttled total was essentially unchanged. We
needed to know *where* the time was actually going, so we added the
`_pipeline.*` and `_dispatch.<name>` instrumentation described in the
**Method** section above.

The first instrumented run made the situation obvious:

| Phase at 20× throttle | Median (ms) |
|---|---:|
| `_pipeline.dispatch` (sync of all 13 component fns) | 955.9 |
| `_pipeline.resolve` (await raceAllPerformance) | 97.4 |
| `_pipeline.filter` / `.stringify` / `.hash` / `.assembly` | < 0.1 each |

The post-component pipeline was already optimal. The 956 ms gap was sync
component-prelude work — JS in component bodies that runs synchronously when
the function is called, before any `await` yields. Per-component timing
narrowed it further:

| `_dispatch.<name>` | Median (ms) |
|---|---:|
| `_dispatch.webgl` | 599.9 (60% of dispatch) |
| `_dispatch.canvas` | 219.3 (22%) |
| `_dispatch.fonts` | 138.2 (14%) |
| everything else | < 20 each |

That established the targets for (7) and (8).

### 7. `webgl` — module-scoped caching (browser-aware)
`src/components/webgl/index.ts`

The component was creating a fresh canvas, fresh GL context, freshly compiled
shader program, freshly created vertex buffer, and freshly computed 137-spoke
`Float32Array` on every call. All of those inputs are constants. Shader
compile + program link is the most expensive WebGL operation on most browsers.

Refactored:
- Module-level constants for canvas dimensions (200×100), spoke count (137),
  shader source strings.
- Module-level `_VERTICES` IIFE that precomputes the spoke `Float32Array` once
  at module load. Pure data, not GL-context-tied — applies to *all* browsers
  including Brave.
- `setupWebGL(): WebGLCache | null` encapsulates the full setup (canvas + gl +
  shaders + program + buffer). Returns null on any failure.
- `_USE_CACHE = getBrowser().name !== 'Brave'`. For non-Brave browsers, lazy-init
  the `WebGLCache` on first call, reuse on subsequent calls. For Brave: always
  call `setupWebGL` fresh (Brave farbles WebGL `readPixels` per-context;
  caching would shift their hash once).
- `renderImage(cache)` does only `useProgram` + `bindBuffer` + `drawArrays` +
  `readPixels` + state reset. No setup work.

Other privacy browsers (Tor, Firefox-RFP) typically disable WebGL entirely or
return constants — caching gives byte-identical output in those cases too.

### 8. `getCommonPixels` — short-circuit + inline 3-way
`src/utils/commonPixels.ts`

After (7) the throttled webgl number had barely moved. Reading `getWebGL`
explained why: it has no `await` keyword anywhere, so `_dispatch.webgl`
includes the entire computation, not just the setup. The actual hot spot was
`getCommonPixels`, which for `_RUNS=1` (the every-non-Samsung case) was doing
80,000+ allocations to find "the most common byte of a single-element array" —
which is always that single byte:

```ts
// per byte position (× 80,000 for 200×100 RGBA):
let indice: number[] = [];                       // new array
for (let u = 0; u < images.length; u++)          // images.length === 1
  indice.push(images[u].data[i]);
finalData.push(getMostFrequent(indice));         // grows finalData via .push()

// inside getMostFrequent:
const frequencyMap: { [key: number]: number } = {};   // new object
for (const num of arr) frequencyMap[num] = ...;
for (const num in frequencyMap)                       // iterates string keys
  if (...) mostFrequent = parseInt(num, 10);          // parseInt to recover num
```

Two surgical changes:

- `if (images.length === 1) return images[0]` — short-circuit. Output bytes
  are byte-identical (most common of `[x]` is `x`). Massive win for webgl
  (the common case).
- For `images.length === 3` (canvas always, Samsung webgl): replace the
  per-byte `getMostFrequent` call with the inline ternary
  `out[i] = (x===y) ? x : (x===z) ? x : (y===z) ? y : x`. This preserves the
  original tie-breaking exactly (all-equal / 2-of-3-match / all-different cases
  fall through to the same answer the frequency-map algorithm would give).
  Wins for canvas (always `_RUNS=3`) and Samsung webgl.

Generic-N fallback preserved unchanged for any future caller using N other
than 1 or 3.

This was the change that moved the headline number. After it landed:
`_dispatch.webgl` 642 → 33.6 ms (−95%), `_dispatch.canvas` 218 → 20.9 ms
(−90%), TOTAL 1166 → 342 ms (−71%).

## Hash-stability proof

Three independent layers of evidence:

1. **Code-level reasoning.** Every change either operates on data that's
   downstream-equivalent (length-1 short-circuit, length-3 inline tie-break),
   touches code paths the hash never reaches (timing instrumentation in
   `elapsed`, console.error removal, timer cleanup, cycle-detection internals),
   or substitutes module-cached objects whose outputs are byte-identical to
   freshly-created ones for non-noise-injecting browsers (webgl).
2. **Per-iteration intra-run stability.** The harness compares
   `res.thumbmark` across the 5 iterations of every run; `stable: true` was
   reported on every measurement of the session.
3. **CDN-vs-local cross-build equivalence.** The published 1.8.1 (which carries
   none of our changes) and the optimized local 1.8.1 were loaded into the same
   Chrome instance with the same CPU throttling and produced byte-identical
   thumbmarks. This is the definitive empirical proof.

## Trade-offs and what we did *not* change

**Acceptable hash-changing scenarios.** Two of our changes can shift the hash
for narrow user populations. Both are documented and both are net-stability
improvements:

- *webrtc*: users who previously hit the timeout path
  (`{ supported: true, ...compressed, timeout: true }` instead of
  `{ ...compressed, candidateType: 'host' }`) get a one-time hash change. These
  users were already getting a non-deterministic fingerprint (the timeout fires
  based on network conditions). Now they get a deterministic one.
- *webgl*: caching is *off* for Brave specifically. For Tor / Firefox-RFP /
  other privacy browsers that disable WebGL or return constants, caching gives
  byte-identical output to the un-cached path — no hash impact.

**Hash-stable opportunities not pursued.** Documented in
`docs/perf-notes.md` for follow-up:

- *fonts iframe caching*: caching the iframe across `tm.get()` calls would
  help repeated-call use cases (~30-60 ms saving for 2nd+ call). Single-call
  savings are zero. Not done because most thumbmarkjs callers do one
  `tm.get()` per page.
- *stableStringify micro-tweaks*: `JSON.stringify(key)` in a hot loop could
  be replaced with manual ASCII-safe quoting; cycle detection could be removed
  entirely (fingerprint data is trusted to be acyclic). Both are sub-millisecond
  in the measurements we have. Worth doing only if a profile shows
  `_pipeline.stringify` somewhere we haven't measured.

**Hash-changing options not pursued (would have been bigger wins).**

- *WebRTC Option C*: replace the peer-connection dance with sync
  `RTCRtpReceiver.getCapabilities('audio'/'video')`. Would drop webrtc to <1 ms
  unthrottled, ~2-3 ms throttled. Different data shape → different hash. Worth
  considering for a 2.0.0 major bump.
- *Skipping/restructuring components*: any change to what data audio / canvas /
  fonts / webgl emit would change the hash. Out of scope for this session per
  the user's "preserve fingerprint" constraint.

## Open follow-ups

By remaining throttled cost, in order:

1. **`_dispatch.fonts` (124.5 ms at 20× post-optimization).** iframe creation
   forces layout/reflow + 89 sync `measureText` calls. iframe caching across
   calls (helps multi-call use), or main-document canvas (risks drift if page
   has custom `@font-face`). Largest remaining hash-stable target.
2. **`webrtc` async (~100 ms).** Browser-internal codec serialization in
   `createOffer` + `setLocalDescription`. Floor cost in the current architecture.
3. **`audio` (~23 ms).** `OfflineAudioContext.startRendering()` is
   browser-internal. Floor cost.
4. **Bootstrap the Playwright perf bench.** `perf/perf.spec.ts` exists in the
   repo but its config doesn't resolve (the implementor for the perf agent
   reported a TS2048 implicit-`any` on a `reduce` callback there). Until that's
   fixed, perf regressions are caught only by the manual `test.html` harness,
   not by CI.
5. **WebGL component-loss handling.** The cached `WebGLCache` survives across
   `tm.get()` calls but doesn't recover from `webglcontextlost` events
   (suspended tab → context destroyed). Today: the cached null persists, so
   webgl reports `unsupported` until the next page load. Not seen in practice
   but worth a recovery hook eventually.

## Files changed (for review)

```
 M src/components/webrtc/index.ts        # change 1
 M src/utils/raceAll.ts                  # change 2
 M src/components/system/browser.ts      # change 3
 M src/utils/stableStringify.ts          # change 4
 M src/components/audio/index.ts         # change 5
 M src/functions/index.ts                # change 6 (instrumentation)
 M src/components/webgl/index.ts         # change 7
 M src/utils/commonPixels.ts             # change 8
?? docs/perf-notes.md                    # running perf log (this session + future)
?? docs/perf-optimization-report.md      # this report
?? test.html                             # harness with source toggle + hash capture
```

156/156 Jest tests pass. `npm run build` clean. No new runtime dependencies.
The exported public API surface of the library is unchanged. The `elapsed`
field gains the `_pipeline.*` and `_dispatch.<name>` keys when
`options.performance: true`; consumers of `elapsed` who don't recognize those
keys will simply ignore them.

## Reproducing the comparison

In one terminal, from the repo root:

```bash
npm run build
python3 -m http.server 4173 --bind 127.0.0.1
```

In Chrome with DevTools open and **CPU throttling at 20× slowdown** (Performance
panel → CPU dropdown):

- `http://127.0.0.1:4173/test.html?source=local&cpu=20x` — optimized local build
- `http://127.0.0.1:4173/test.html?source=cdn&cpu=20x` — published 1.8.1 from
  jsDelivr

Each page auto-runs and renders a sorted timing table. The thumbmark hash is
visible in the page (raw last-run elapsed pane shows the elapsed map; the
console shows `[thumbmarkjs perf] thumbmark: <hash>`). The full result is also
JSON-encoded into `document.title` as `__PERF__:{...}` for programmatic
capture.

Both builds should produce thumbmark `0ef8bdbc97de077c45a46358ecc4ba42` on the
same browser/device; the wall-clock should differ by ~3×.
