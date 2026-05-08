import { test, expect } from '@playwright/test';

/**
 * End-to-end test: WebGL context-loss recovery.
 *
 * Verifies that when the browser fires a webglcontextlost event on the
 * canvas the library has cached, a subsequent tm.get() call rebuilds
 * the WebGL context from scratch and produces an identical fingerprint.
 *
 * Prerequisites:
 *   - A static HTTP server must be running on http://localhost:3333
 *     serving the repo root (so /dist/thumbmark.umd.js is reachable).
 *   - The library must have been built: `npm run build`.
 *
 * The test does NOT spawn a server itself; the orchestrator is responsible
 * for starting one before invoking `npx playwright test`.
 */

test.describe('WebGL context-loss recovery', () => {
  test('fingerprint is stable after WEBGL_lose_context.loseContext()', async ({ page }) => {
    // Patch getContext BEFORE the page (and its scripts) load so that
    // every WebGLRenderingContext the library creates is captured in
    // window.__capturedGLs.  Playwright's addInitScript() runs in the
    // page context before any <script> on the page executes — ideal.
    await page.addInitScript(() => {
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      (window as any).__capturedGLs = [] as WebGLRenderingContext[];

      (HTMLCanvasElement.prototype as any).getContext = function (...args: any[]) {
        const ctx = origGetContext.apply(this, args as any);
        if (args[0] === 'webgl' && ctx) {
          (window as any).__capturedGLs.push(ctx);
        }
        return ctx;
      };
    });

    // Navigate to a blank page on the static server, then inject the UMD bundle directly.
    // This avoids depending on any specific HTML file existing in the repo root.
    await page.goto('http://localhost:3333/');   // 200 OK from http-server's directory listing is fine
    await page.addScriptTag({ url: '/dist/thumbmark.umd.js' });
    await page.waitForFunction(() => !!(window as any).ThumbmarkJS);

    // -----------------------------------------------------------------------
    // First tm.get() — warms up the WebGL cache inside the library
    // -----------------------------------------------------------------------
    const result1 = await page.evaluate(async () => {
      // @ts-ignore — ThumbmarkJS loaded via <script>
      const tm = new ThumbmarkJS.Thumbmark();
      // Exclude the speech component: in headless Chromium speechSynthesis.getVoices()
      // returns 0 voices on some runs and 68 on others depending on whether
      // 'voiceschanged' fires before the component's internal timeout. This is a
      // pre-existing flakiness unrelated to the webgl context-loss recovery we're
      // testing. Excluding it isolates the test to the WebGL behavior under test.
      const data = await tm.get({ exclude: ['speech'] });
      return {
        thumbmark: data.thumbmark as string,
        commonPixelsHash: (data.components?.webgl as any)?.commonPixelsHash as string | undefined,
      };
    });

    // WebGL must have produced a real hash, not the 'unsupported' fallback
    expect(result1.commonPixelsHash).toBeDefined();
    expect(result1.commonPixelsHash).not.toBe('unsupported');

    // -----------------------------------------------------------------------
    // Force context loss on the library's cached GL context
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const gls = (window as any).__capturedGLs as WebGLRenderingContext[];
      if (gls.length === 0) throw new Error('No WebGL contexts were captured');

      // The library creates its canvas once and caches it; that context will
      // be the last (or only) entry in __capturedGLs after the first tm.get().
      const lastGL = gls[gls.length - 1];
      const ext = lastGL.getExtension('WEBGL_lose_context');
      if (!ext) throw new Error('WEBGL_lose_context extension not available in this browser/environment');
      ext.loseContext();
    });

    // Give the browser a tick to fire and propagate the webglcontextlost event
    await page.waitForTimeout(50);

    // -----------------------------------------------------------------------
    // Second tm.get() — library must rebuild from scratch
    // -----------------------------------------------------------------------
    const result2 = await page.evaluate(async () => {
      // @ts-ignore
      const tm = new ThumbmarkJS.Thumbmark();
      const data = await tm.get({ exclude: ['speech'] });
      return {
        thumbmark: data.thumbmark as string,
        commonPixelsHash: (data.components?.webgl as any)?.commonPixelsHash as string | undefined,
      };
    });

    // -----------------------------------------------------------------------
    // Assertions
    // -----------------------------------------------------------------------

    // WebGL recovered and produced a real hash (not 'unsupported')
    expect(result2.commonPixelsHash).toBeDefined();
    expect(result2.commonPixelsHash).not.toBe('unsupported');

    // The fingerprint is stable across context loss + rebuild
    expect(result2.thumbmark).toBe(result1.thumbmark);

    // The webgl sub-hash is also identical
    expect(result2.commonPixelsHash).toBe(result1.commonPixelsHash);

    // Rebuilding created at least one additional GL context, confirming that
    // the library did not silently reuse the lost (invalid) context.
    const capturedCount = await page.evaluate(() => {
      return ((window as any).__capturedGLs as WebGLRenderingContext[]).length;
    });
    expect(capturedCount).toBeGreaterThan(1);
  });
});
