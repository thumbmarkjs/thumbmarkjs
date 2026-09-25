import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 120000,
  use: {
    headless: true,
  },
  // The spec loads http://localhost:3335/perf/index.html, which pulls in
  // /dist/thumbmark.umd.js -- so the server must be rooted at the REPO root,
  // not at perf/ (webServer.cwd defaults to this config file's directory).
  // Port 3335: the root-level e2e suite's config (../playwright.config.ts)
  // already owns a different port for its own server, which is rooted at a
  // different content directory (./testpage), and ab-bench.mjs owns the port
  // one below this one. Keep this port in sync with the URL in
  // perf/perf.spec.ts -- if they drift the suite dies with
  // ERR_CONNECTION_REFUSED.
  webServer: {
    command: 'npx serve . -p 3335',
    port: 3335,
    cwd: '..',
    // Reuse locally for fast iteration; always start clean in CI.
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
