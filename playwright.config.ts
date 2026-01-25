import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    headless: true,
    baseURL: 'file://' + process.cwd(),
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    // Uncomment to test other browsers:
    // { name: 'firefox', use: { browserName: 'firefox' } },
    // { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npx serve ./testpage -p 3333',
    port: 3333,
    reuseExistingServer: true,
  },
});
