# Performance notes

A running log of perf investigations, measurements, and changes to thumbmarkjs.
Each entry should be self-contained: motivation, measurement, what changed, what's
deferred, and how to reproduce.

---

## 2026-05 — Pipeline instrumentation + four hash-stable wins

### TL;DR

Added diagnostic `_pipeline.*` timers to the post-component pipeline (gated on
`options.performance`, so they only show up for callers that already opted into
timing). They confirmed that under 20× CPU throttling the **wall-clock budget is
overwhelmingly inside component sync preludes** — `_pipeline.dispatch = 955.9 ms`
out of a 1064 ms total. The post-component pipeline (filter, stringify, hash,
assembly) is essentially free even at 20× throttle.

Also landed four hash-stable cleanups discovered while reading the pipeline:

1. `raceAllPerformance` was leaking one `setTimeout(5000)` per component per call —
   the timer was never cleared when the actual promise resolved first. 13 timers
   per `tm.get()` accumulated indefinitely. Now refactored to use an explicit
   `clearTimeout` when the real promise wins the race.
2. `getBrowser()` (UA-parse with up to 12 regex matches) was being recomputed
   inside every `getExcludeList` call, which is invoked from `filterThumbmarkData`
   plus `resolveClientComponents` — at least twice per `tm.get()`. Now
   memoized with a `Map<cacheKey, BrowserResult>` keyed on
   `(navigator.brave ? 'B|' : 'N|') + navigator.userAgent`. Invalidates correctly
   in tests since each test case mocks a distinct UA.
3. `stableStringify` cycle detection used `seen.indexOf(node)` on an array
   (O(N²) over a full traversal). Replaced `seen` with `Set<any>` for O(1)
   lookups. Output string is byte-identical for non-cyclic input.
4. `getAudio` had a stray `console.error('Error creating audio fingerprint:', error)`
   in its catch path. Removed; the existing `reject(error)` already routes the
   error through `raceAllPerformance`'s structured error channel.

### Hash-stability verification

| Phase | thumbmark hash |
|---|---|
| Pre-change baseline (Chrome / macOS) | `0ef8bdbc97de077c45a46358ecc4ba42` |
| Post-change | `0ef8bdbc97de077c45a46358ecc4ba42` |
| Stable across all 5 iterations | ✓ |

Methodology: extended `test.html` to capture `res.thumbmark` per iteration into
the title-encoded payload, with a sanity check that all iterations produce the
same hash. Pre-change capture, code change, post-change capture, byte compare.
The harness's `stable: true` field flags any drift across iterations.

### Pipeline breakdown (20× CPU throttle, 5 iterations + 1 warm-up)

| Phase | Median (ms) |
|---|---:|
| `_pipeline.dispatch` (sync component-fn calls, all 13) | **955.9** |
| `_pipeline.resolve` (`await raceAllPerformance(...)`) | 97.4 |
| `_pipeline.filter` (both filter calls combined) | 0.0 |
| `_pipeline.stringify` | 0.0 |
| `_pipeline.hash` | 0.1 |
| `_pipeline.assembly` | 0.0 |
| **TOTAL `tm.get()` wall-clock** | **1064.2** |

`_pipeline.resolve` ≈ slowest component's async work (webrtc at 94 ms). All other
components finish in parallel within that window. The 956 ms `dispatch` is the
*serial* sync work of constructing each component's setup (`new
OfflineAudioContext(...)`, canvas paints, WebGL context creation, etc.) — these
all happen in the main thread before any `await` yields, and 13 of them queue up.

### What did the four wins actually save?

Almost nothing in this throttled scenario, because the post-component pipeline
was already <1 ms even at 20× throttle. But:

- **#1 (timer leak)** is a correctness bug, not a per-call perf win. Matters for
  pages that call `tm.get()` repeatedly (each call previously left 13 5-second
  timers hanging).
- **#2 (`getBrowser` memoize)** would matter more on slow devices with very
  complex UA strings (e.g. embedded webviews) and on pages that call `tm.get()`
  many times.
- **#3 (`stableStringify` `Set`)** would matter for users with bigger fingerprint
  payloads (custom components, experimental components, many sub-keys).
- **#4 (audio `console.error`)** is cleanliness, not perf.

So these are good housekeeping but they don't move the 20× throttle median. The
investigation was still worth it because it pointed at the real target.

### Where the optimization opportunity actually lives

`_pipeline.dispatch = 956 ms` at 20× throttle = ~47 ms unthrottled (rough scale).
On a Moto G4-class device (4× / mid-tier) the budget is ~190 ms. That's the
dispatch cost — sync work components do *before* their first `await`.

Most of that work is fingerprint-essential (component setup that produces the
hashed signal). But there are likely individual hot spots inside each component
that could be trimmed without changing the data they emit. To find them
surgically we need **per-component dispatch timing** (`_dispatch.audio`,
`_dispatch.canvas`, …), which is a one-line extension of the existing
instrumentation. Without that, picking which component to attack is guessing.

### Deferred follow-ups

1. **Per-component sync-dispatch timing.** Add `const t0 = performance.now(); const
   p = fn(options); _dispatch[key] = performance.now() - t0; return p;` inside
   the dispatch `.map`. Surface in `elapsed` under `_dispatch.<component>` keys.
   Tells us which of the 13 components owns the 956 ms.
2. **Refactor components to `await Promise.resolve()` first.** Cosmetic — pushes
   sync work into the async portion so per-component `elapsed` is accurate. Total
   wall-clock unchanged (single-threaded JS). Useful for diagnostics, not perf.
3. **Inspect heavy-sync components for in-component wins.** Likely candidates:
   audio (OfflineAudioContext + node graph setup), canvas (paints + readback),
   fonts (multiple canvas paints per font), webgl (context + parameter queries).
   Each may have hash-stable micro-optimizations (skip duplicate work, batch
   paints, drop redundant queries) once we know which one dominates.
4. **`stableStringify` further wins.** Drop `JSON.stringify(key)` in favour of
   manual string-quoting for known-safe ASCII keys (saves a function call per
   object key). Skip cycle detection entirely for fingerprint data (the path is
   trusted to be acyclic). Both are tiny in absolute terms — only worth doing if
   profile shows stringify mattering somewhere we haven't measured.
5. **`raceAllPerformance` per-component timeout.** Today every component gets a
   single global 5000 ms timeout. Could be per-component — but the success path
   is unaffected, so this only helps abnormal scenarios.

### Per-component dispatch timing (the next instrumentation pass)

After the four wins above, we still had a 956 ms gap. We added per-component
sync-dispatch instrumentation (`_dispatch.<name>` keys, alongside the
`_pipeline.*` keys, populated when `options.performance` is true) to find which
component owned the gap. Result at 20× throttle:

| `_dispatch.<name>` | Median (ms) |
|---|---:|
| `_dispatch.webgl` | 599.9 |
| `_dispatch.canvas` | 219.3 |
| `_dispatch.fonts` | 138.2 |
| `_dispatch.hardware` | 19.5 |
| `_dispatch.webrtc` | 11.4 |
| `_dispatch.audio` | 8.1 |
| everything else | <8 each |

WebGL alone was 60% of the entire dispatch budget. Canvas + fonts + webgl
together were 90%.

### WebGL component: module-scoped caching (browser-aware)

`src/components/webgl/index.ts` was creating a **fresh canvas, GL context,
compiled shader program, and vertex buffer on every call**. All of that work
was repeated each `tm.get()` even though the inputs are constants — same
shaders, same 137-spoke vertex array (computed via cos/sin per call from the
same constants), same canvas size.

The fix splits into two paths:

- **Non-Brave browsers** (Chrome, Firefox, Safari, Edge, etc.): lazy-init the
  canvas + GL context + shader program + vertex buffer on first call, cache them
  at module scope, and reuse on subsequent calls. The expensive setup (shader
  compile + program link, ~hundreds of ms throttled) becomes one-time. Per-call
  work shrinks to `useProgram` + `bindBuffer` + `drawArrays` + `readPixels`.
- **Brave**: the un-cached path is preserved exactly. Brave farbles WebGL
  readPixels per-context — caching would give it a one-time fingerprint hash
  shift. We sidestep that by detecting Brave via `getBrowser().name === 'Brave'`
  and falling through to fresh-per-call setup.

The constant 137-spoke vertex `Float32Array` is precomputed once at module load
via an IIFE — applies to ALL browsers including Brave (it's pure data, not
GL-context-tied, so byte-identical to what the per-call computation produced).

### `getCommonPixels`: short-circuit + inline 3-way

The webgl caching landed correctly (hash unchanged, `min` of 584 ms confirmed
cached calls weren't paying setup cost) — but `_dispatch.webgl` only dropped
from 599 → 642 ms. The setup wasn't the dominant cost. Reading `getWebGL`
showed it has **no `await` anywhere**, so the `_dispatch.webgl` measurement
includes the entire computation, not just the setup. The post-setup hot path
calls `getCommonPixels(images, w, h)` followed by `hash(commonImageData.data.toString())`.

`getCommonPixels` was the actual culprit. For a 200×100 RGBA image (80,000
bytes) at `_RUNS=1` (every non-Samsung browser), it was doing:

- 80,000 × `[indice].push(byte)` — new array allocation per byte
- 80,000 × `getMostFrequent([byte])` — and that helper allocates a new
  `frequencyMap = {}` object, sets one key, then does a `for...in` with
  `parseInt(num, 10)` to convert the string key back to a number — all to find
  "the most common of a single-element array" (which is always that element).
- ~320,000 transient object/array allocations per call.

Two fixes in `src/utils/commonPixels.ts`:

1. **`images.length === 1` short-circuit** — return `images[0]` directly. Bytes
   are byte-identical to what the algorithm would have produced. Massive win
   for webgl (the common case).
2. **`images.length === 3` inline branch** — `out[i] = (x===y) ? x : (x===z) ? x : (y===z) ? y : x`,
   which is a direct algebraic encoding of the frequency-map logic and
   preserves the original tie-breaking exactly:
   - all-equal → that value (first ternary fires)
   - 2-of-3 match → the matching value
   - all-different → `arr[0]` (matches the original where `mostFrequent` stays
     at `arr[0]` and no key has a frequency strictly greater).

   Wins for canvas (always `_RUNS=3`) and Samsung WebGL (`_RUNS=3`).

Generic-N fallback is preserved unchanged for hypothetical future callers.

### Combined results (Chrome / macOS, 20× CPU throttle)

| Metric | Baseline (before this whole sweep) | After 4 wins + instr. | After webgl cache | **After getCommonPixels** | Δ vs baseline |
|---|---:|---:|---:|---:|---:|
| TOTAL `tm.get()` wall-clock | 1100.6 ms | 1064.2 ms | 1166.1 ms | **342.1 ms** | **-69%** |
| `_pipeline.dispatch` | (n/a; not yet instrumented) | 993.6 ms | 1037.5 ms | **222.3 ms** | — |
| `_dispatch.webgl` | (n/a) | 599.9 ms | 642.7 ms | **33.6 ms** | -94% |
| `_dispatch.canvas` | (n/a) | 219.3 ms | 218.1 ms | **20.9 ms** | -90% |
| `_dispatch.fonts` | (n/a) | 138.2 ms | 134.2 ms | 124.5 ms | -10% |

Hash on every measurement: **`0ef8bdbc97de077c45a46358ecc4ba42`**. Stable across
all iterations every time.

Scaled estimates:
- Unthrottled (1×): ~52 ms → ~17 ms.
- Mid-tier Android (4× / Moto G4 class): ~210 ms → ~67 ms.
- Low-tier Android (6×): ~330 ms → ~100 ms.

### Remaining slowest items (next targets)

1. **`_dispatch.fonts` (124.5 ms)** — iframe creation forces layout/reflow, then
   89 sync `measureText` calls. The iframe is the biggest single chunk. Caching
   the iframe across calls would help multi-call use cases; single-call is
   harder without risking hash drift (iframe vs main-document canvas could pick
   up page-level `@font-face` rules).
2. **`webrtc` async (~100 ms at 20×)** — sync `createOffer` and
   `setLocalDescription` are browser-internal codec serialization. The only way
   to skip these without changing the fingerprint hash is to pre-cache the
   offer SDP for the session, since codec capabilities don't change during a
   session — risk: subtle SDP variation across calls in some browsers.
3. **`audio` (~23 ms)** — `OfflineAudioContext` rendering is browser-internal.
   Hard to skip without changing the fingerprint.

### Reproducer

The harness now records the thumbmark hash, so pre/post comparisons are explicit:

```bash
# Pre-change
osascript -e 'tell application "Google Chrome" to title of active tab of window 1'
# Look for `__PERF__:{...}` and pull `thumbmark` field.

# After code change + npm run build:
osascript -e 'tell application "Google Chrome" to reload active tab of window 1'
# Wait for `__PERF__:` title, compare `thumbmark` byte-for-byte to pre.
```

A `stable: false` field in the payload signals the hash drifted *across
iterations* in the same run — a separate kind of bug from before/after drift.

---

## 2026-05 — `webrtc` component: removed ICE-candidate wait

### TL;DR

The `webrtc` fingerprint component was the slowest component on every measurement
(13–27 ms median depending on CPU throttling). Most of that time was a race between
a 4500 ms timeout and the first `icecandidate` event — captured purely to record a
`candidateType` value that, with `iceServers: []`, is **always** `"host"` and adds
zero entropy to the fingerprint.

We removed the ICE wait, hardcoded `candidateType: 'host'` to preserve the
fingerprint hash for the >>99% common path, and closed the `RTCPeerConnection`
synchronously after extracting the SDP-derived data (which is the actual signal).

### Pre-change measurement (CPU-throttled)

Source: `test.html` perf harness (5 iterations after 1 warm-up), Chrome DevTools
**6× CPU slowdown** (low-tier Android), library version 1.8.1.

| Component | median (ms) | min | max |
|---|---:|---:|---:|
| **TOTAL (`tm.get()` wall-clock)** | **297.0** | 290.8 | 335.7 |
| webrtc | 26.5 | 24.2 | 37.4 |
| audio | 5.4 | 5.0 | 6.6 |
| canvas | 0.9 | 0.1 | 1.2 |
| fonts | 0.9 | 0.1 | 1.2 |
| hardware | 0.9 | 0.0 | 1.2 |
| locales | 0.9 | 0.0 | 1.2 |
| math | 0.9 | 0.0 | 1.1 |
| plugins | 0.1 | 0.0 | 1.1 |
| screen | 0.1 | 0.0 | 1.0 |
| system | 0.1 | 0.0 | 0.5 |
| webgl | 0.0 | 0.0 | 0.5 |
| speech | 0.0 | 0.0 | 0.1 |

Notable: components sum to ~36 ms, but the TOTAL wall-clock is ~297 ms. The
remaining ~260 ms lives outside the per-component instrumentation — likely
`stableStringify` + hashing in `getThumbmark`, factory/promise scheduling, and
cross-component awaits. Out of scope for this entry; tracked as a follow-up.

### Why webrtc was slow

The pre-change component flow:

1. `new RTCPeerConnection({ iceCandidatePoolSize: 1, iceServers: [] })`
2. `connection.createDataChannel('')` — registers media so the offer SDP gets generated
3. `await createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })` —
   Chrome serializes the entire codec list into the SDP. **This is the actual
   fingerprint signal.**
4. `await setLocalDescription(offer)` — kicks off ICE gathering
5. Regex-extract codecs/extensions from `offer.sdp`
6. **Wait for the first `icecandidate` event with a 4500 ms timeout**
7. Resolve with `{ ...compressedData, candidateType: 'host' }` (or `{ timeout: true }`
   if the event never fires)

Step 6 is the killer. With `iceServers: []`, Chrome only generates **host
candidates** — local network interfaces, all reported as `candidateType === 'host'`.
That field is invariant across users (every browser produces it), so it adds zero
entropy to the hash. But the function spent its entire post-SDP time waiting for an
event whose value was already known by construction.

Estimated cost breakdown under 6× throttling:

| Step | Cost (6× throttled) | Fingerprint signal? |
|---|---:|---|
| ctor + `createDataChannel` | ~2 ms | none |
| `await createOffer` | ~6–8 ms | YES (whole codec list) |
| `await setLocalDescription` | ~3 ms | none (kicks off ICE) |
| SDP regex extraction | ~1–2 ms | YES |
| **wait for `icecandidate`** | **~3–10 ms (variable)** | **none** |
| `connection.close()` | ~1 ms | none |

### Options considered

| # | Approach | Code delta | Throttled saving | Hash stability |
|---|---|---|---:|---|
| **A** | **Drop the ICE wait. Hardcode `candidateType: 'host'`. Close immediately.** | ~25 lines removed, ~5 added | ~3–5 ms median | **stable for >>99% (the common-path users)** |
| B | Same as A but remove `candidateType` from result | ~25 lines removed | ~3–5 ms median | breaks — hash changes for everyone |
| C | Replace peer-connection dance with sync `RTCRtpReceiver.getCapabilities('audio'/'video')` | ~80 lines rewritten | ~22+ ms (≈ 0 ms residual) | breaks — different data shape, new hash |
| D | Cache the result after first call (sessionStorage / module-scope memoize) | ~5 lines added | only helps 2nd+ call on same page | stable |

We chose **Option A** for shippability: small, hash-stable for the common path, no
new dependencies, no test surface to mock.

### What changed

`src/components/webrtc/index.ts` only. Two related edits in one file:

1. **Removed the ICE wait** (the inner `Promise<componentInterface>` that wrapped a
   `setTimeout` + `addEventListener('icecandidate', onIceCandidate)` race).
   Hardcoded `candidateType: 'host'` in the result object so the hash is stable
   for the previously-common-path users.

2. **Fixed a pre-existing resource leak in the outer catch.** `connection` was
   declared `const` inside the outer `try`, so if `new RTCPeerConnection()` or
   `createDataChannel('')` threw synchronously, the outer catch could not safely
   close the connection. Moved the declaration out as `let connection:
   RTCPeerConnection | undefined`, added `connection?.close()` to the outer catch.

The exported function signature is unchanged. The `options?: optionsInterface`
parameter is intentionally retained for ABI stability even though `options.timeout`
is no longer read (matches the pattern other components like `permissions` and
`fonts` use).

### Hash-stability analysis

The result object now has shape `{ supported: true, audio, video, extensionsHash,
candidateType: 'host' }` for the success path. Compared to the previous code:

- **Users who previously hit the success path with `candidateType: 'host'`** (the
  overwhelming majority — any browser that generated a host candidate within
  4500 ms): hash is **identical**. No fingerprint regression.
- **Users who previously hit the timeout path with `{ timeout: true }`** (rare —
  browsers with aggressive WebRTC restrictions that never fire `icecandidate`):
  hash **changes once**, then becomes stable forever. Net win: their fingerprint
  was previously non-deterministic (sometimes `'host'`, sometimes `timeout: true`
  depending on conditions), now it's deterministic.

### Post-change measurement (CPU-throttled)

Same harness, same throttling, same iteration count.

| Component | median (ms) | Δ vs pre |
|---|---:|---:|
| **TOTAL** | **316.6** | +19.6 (within noise) |
| **webrtc** | **23.4** | **−3.1** |
| audio | 6.3 | +0.9 (within noise) |
| canvas / fonts / hardware / locales / math | 1.0 | +0.1 (within noise) |
| plugins / screen / system | 0.1 | unchanged |
| webgl / speech | 0.0 | unchanged |

The webrtc median dropped from 26.5 → 23.4 ms (-12%). The min dropped from 24.2 →
21.8 ms.

### Honest gap: predicted vs actual

Before the change I estimated a 15–20 ms throttled saving on webrtc. The actual
saving is closer to **3 ms median**. My estimate was wrong because I overweighted
the `icecandidate` event-dispatch latency. With `iceServers: []`, the first host
candidate is generated almost immediately after `setLocalDescription`, so the wait
was much shorter than the worst-case 4500 ms timeout. Real throttled cost of the
wait was on the order of 3–5 ms, not 15–20.

What we got is still a real win — we removed both the wait *and* the timeout
machinery, simplified the code, and reduced variance. But the bulk of webrtc's
time (now ~23 ms throttled) lives in `await createOffer` and `await
setLocalDescription` — which are Chrome-internal codec serialization and SDP
processing. The only way to skip those is **Option C** (`RTCRtpReceiver.getCapabilities`),
which requires accepting a fingerprint hash change.

### Deferred follow-ups

1. **No colocated test for `src/components/webrtc/index.ts`.** The component has
   never had a test file. Adding one requires mocking `RTCPeerConnection` (and the
   vendor-prefixed variants) in jsdom, which is non-trivial. Coverage worth adding:
   feature-detect failure path, nominal SDP path, `createOffer` rejection path.
2. **Per-descriptor `new RegExp()` allocation in `constructDescriptions`.** A
   typical SDP yields 10–20 audio/video payload types; we currently allocate one
   `RegExp` per descriptor per media type, ~20–40 RegExp constructions per
   fingerprint call. A single-pass scan that groups SDP lines by payload ID into a
   `Map` would reduce that to O(1) regex compilation. Pre-existing — not addressed
   in this change.
3. **The 260 ms gap between summed components and TOTAL wall-clock** (under 6×
   throttling). Most likely lives in `stableStringify` + hashing in
   `src/functions/index.ts` and in promise/factory scheduling. A `performance.mark`
   /`performance.measure` pair around `getThumbmark`'s post-component pipeline
   would localize it.
4. **Option C — `RTCRtpReceiver.getCapabilities`.** ~22 ms additional throttled
   saving available. Requires a fingerprint hash bump (different data shape).
   Defensible on a 1.x → 1.(x+1).0 minor or a 2.0.0 major.
5. **Bootstrap the Playwright perf bench.** `perf/perf.spec.ts` exists but its
   Playwright config is broken (`tm-js-perf` reported a config-resolution failure;
   the file itself has a TS2048 implicit-`any` error on `reduce` callback params).
   Until that's fixed, perf regression checks rely on the manual `test.html`
   harness rather than a deterministic CI bench.

### How to reproduce the measurement

The repo ships a self-contained perf harness at `test.html`. It loads the local
UMD build (`dist/thumbmark.umd.js`) and exposes a UI to run N iterations of
`tm.get({ performance: true })`, then renders a sorted timing table.

Useful tricks the harness supports:

- **Title-encoded results.** After a run completes, `document.title` is set to
  `__PERF__:{...json...}` containing the version, CPU note, and per-component
  timings. This lets external pollers (AppleScript, Bash) read the numbers without
  needing CDP / chrome-devtools MCP access.
- **Re-run button.** DevTools CPU throttling persists across re-runs while
  DevTools stays open, so you can change the throttle dropdown and click Re-run
  to compare 1× / 4× / 6× without losing throttling state.
- **`?cpu=` query param.** Pre-fills the CPU note for the run summary so the
  console log carries the throttling state.

Reproduce:

```bash
# Build
npm run build

# Serve (any static server works; python is built-in on macOS)
python3 -m http.server 4173 --bind 127.0.0.1 &

# Open the harness, then in DevTools → Performance → CPU dropdown set
# "4x slowdown" (mid-tier Android — Lighthouse mobile default, Moto G4 class) or
# "6x slowdown" (low-tier). Reload or click Re-run.
open "http://127.0.0.1:4173/test.html?cpu=4x"
```

To poll the title from a CLI (macOS, Chrome must be running with the test.html
tab somewhere):

```bash
osascript -e 'tell application "Google Chrome" to title of active tab of window 1'
# Look for output starting with `__PERF__:` then JSON.parse the rest.
```
