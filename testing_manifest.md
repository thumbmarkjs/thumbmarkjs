# Testing Manifest & Expansion Plan

## Current Compatibility Matrix

| Environment Type | Tooling | Target | Status |
| :--- | :--- | :--- | :--- |
| **Simulated Browser** | Jest + JSDOM | Shared DOM APIs | ✅ Comprehensive |
| **Component Robustness** | Jest + JSDOM | Edge Cases (Mocked) | ✅ Added for `hardware` |
| **Node.js** | Jest (node) | No Browser APIs | ✅ Basic (verified in `thumbmark.test.ts`) |
| **Headless Browser** | Playwright | Chromium | ✅ Primary |
| **Headless Browser** | Playwright | Firefox | ⚠️ Configured but disabled |
| **Headless Browser** | Playwright | Webkit (Safari) | ⚠️ Configured but disabled |

## Current Script Mapping (`package.json`)
- `npm test`: Runs units in JSDOM.
- `npm run test:node`: Runs compatibility tests in pure Node.
- `npm run test:e2e`: Runs E2E tests in Chromium.

---

## Expansion Plan

### 1. Browser & Device Coverage (Short Term)
- **Action**: Enable Firefox and Webkit in `playwright.config.ts`.
- **Action**: Add Mobile Emulation (Mobile Chrome, Mobile Safari) to verify touch/hardware fingerprinting.
- **Goal**: Ensure 100% consistency across major modern engines (Blink, Gecko, Webkit).

### 2. SSR & Framework Compatibility (Medium Term)
- **Action**: Create a small smoke test for Next.js (App Router) to ensure Thumbmark doesn't break server-side bundle generation.
- **Action**: Add a "no-window" safety check routine to the library's init phase to prevent hydration mismatches or build-time crashes.

### 3. Privacy & Restriction Scenarios (Medium Term)
- **Action**: Test against "Strict" tracking protection in Firefox/Brave.
- **Action**: Verify behavior in Incognito/Private windows (where some storage/APIs are restricted).
- **Goal**: Measure "Fingerprint Drift" in privacy-preserving environments.

### 4. Continuous Integration (Long Term)
- **Action**: Integrate all the above into a GitHub Action matrix testing Node 18, 20, and 22.
- **Action**: Automated daily E2E runs against the `static/iframe.html` tests to detect regression in detection accuracy.

### 5. API Resilience
- **Action**: Mock API failures (401, 429, 500) in E2E tests to ensure the fallback local hashing mechanism works perfectly.

---

## Graceful Degradation Architecture

### Environment Requirements
**Thumbmark requires a browser environment.** It is not designed for pure Node.js execution.

- **Central Guard**: `getThumbmark()` checks for `document` and `window` at startup (lines 57-65 in `functions/index.ts`)
- **Early Exit**: Returns error response if browser APIs unavailable: `{ thumbmark: '', components: {}, error: 'Browser environment required' }`

### Component-Level Graceful Degradation
Individual components handle missing **specific browser APIs**:

| Component | Guards For | Behavior |
|:---|:---|:---|
| `audio` | `AudioContext`, `OfflineAudioContext` | Returns `null` if unavailable |
| `canvas` | Canvas context (`getContext('2d')`) | Returns `null` if unavailable |
| `webgl` | WebGL context | Returns `"undefined"` if unavailable |
| `system/browser` | `navigator` | Returns `null` if unavailable |
| `screen` | `matchMedia`, `screen` | Returns `null` if unavailable |
| `speech` | `window.speechSynthesis` | Returns `null` if unavailable |

### E2E Testing of Degradation
The Playwright test suite (`e2e/headless.spec.ts`) validates graceful degradation by:
- Disabling canvas via context override
- Removing AudioContext from window
- Blocking WebGL context creation
- Testing with **all APIs disabled simultaneously**

All tests verify Thumbmark continues to generate a fingerprint even with missing APIs.
