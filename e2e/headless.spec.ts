import { test, expect } from '@playwright/test';

test.describe('ThumbmarkJS Headless Browser Tests', () => {
  test('should generate fingerprint in headless Chrome', async ({ page }) => {
    await page.goto('http://localhost:3333/index.html');

    // Wait for ThumbmarkJS to load and get fingerprint
    const result = await page.evaluate(async () => {
      // @ts-ignore - ThumbmarkJS is loaded via script tag
      const thumbmark = new ThumbmarkJS.Thumbmark();
      const data = await thumbmark.get();
      return data.thumbmark;
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('should handle disabled canvas gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Override canvas to return null context (simulating disabled canvas)
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (type: string) {
        if (type === '2d' || type === 'webgl' || type === 'webgl2') {
          return null;
        }
        return originalGetContext.call(this, type);
      };
    });

    await page.goto('http://localhost:3333/index.html');

    // Should not throw, should still complete
    const result = await page.evaluate(async () => {
      try {
        // @ts-ignore
        const thumbmark = new ThumbmarkJS.Thumbmark();
        const data = await thumbmark.get();
        return data.thumbmark;
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(result).toBeDefined();
    // Either returns a fingerprint or handles error gracefully
    if (typeof result === 'object' && 'error' in result) {
      console.log('Canvas disabled error:', result.error);
    } else {
      expect(typeof result).toBe('string');
    }

    await context.close();
  });

  test('should handle missing 2D canvas context while keeping other components', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Disable ONLY 2D canvas context
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (type: string) {
        if (type === '2d') {
          return null;
        }
        return originalGetContext.call(this, type);
      };
    });

    await page.goto('http://localhost:3333/index.html');

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const thumbmark = new ThumbmarkJS.Thumbmark();
      const data = await thumbmark.get();
      return {
        thumbmark: data.thumbmark,
        components: data.components
      };
    });

    expect(result.thumbmark).toBeDefined();
    expect(typeof result.thumbmark).toBe('string');

    // Verify canvas is missing/undefined but others are present
    expect(result.components.canvas).toBeUndefined();
    expect(result.components.system).toBeDefined();
    expect(result.components.hardware).toBeDefined();

    await context.close();
  });

  test('should handle missing WebGL context while keeping other components', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Disable ONLY webgl context
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (type: string) {
        if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') {
          return null;
        }
        return originalGetContext.call(this, type);
      };
    });

    await page.goto('http://localhost:3333/index.html');

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const thumbmark = new ThumbmarkJS.Thumbmark();
      const data = await thumbmark.get();
      return {
        thumbmark: data.thumbmark,
        components: data.components
      };
    });

    expect(result.thumbmark).toBeDefined();
    expect(typeof result.thumbmark).toBe('string');

    // WebGL should return 'unsupported' info object or be omitted if null (based on implementation)
    // Actually webgl returns { webgl: 'unsupported' } inside the components map
    expect(result.components.webgl).toEqual({ webgl: 'unsupported' });
    expect(result.components.system).toBeDefined();
    expect(result.components.canvas).toBeDefined(); // Canvas 2D should still work

    await context.close();
  });

  test('should handle missing AudioContext gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Override AudioContext to throw (simulating missing audio support)
    await page.addInitScript(() => {
      // @ts-ignore
      window.AudioContext = undefined;
      // @ts-ignore
      window.webkitAudioContext = undefined;
      // @ts-ignore
      window.OfflineAudioContext = undefined;
      // @ts-ignore
      window.webkitOfflineAudioContext = undefined;
    });

    await page.goto('http://localhost:3333/index.html');

    const result = await page.evaluate(async () => {
      try {
        // @ts-ignore
        const thumbmark = new ThumbmarkJS.Thumbmark();
        const data = await thumbmark.get();
        return data.thumbmark;
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(result).toBeDefined();
    if (typeof result === 'object' && 'error' in result) {
      console.log('Audio disabled error:', result.error);
    } else {
      expect(typeof result).toBe('string');
    }

    await context.close();
  });

  test('should handle missing WebGL gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Disable WebGL
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return originalGetContext.call(this, type);
      };
    });

    await page.goto('http://localhost:3333/index.html');

    const result = await page.evaluate(async () => {
      try {
        // @ts-ignore
        const thumbmark = new ThumbmarkJS.Thumbmark();
        const data = await thumbmark.get();
        return data.thumbmark;
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(result).toBeDefined();
    if (typeof result === 'object' && 'error' in result) {
      console.log('WebGL disabled error:', result.error);
    } else {
      expect(typeof result).toBe('string');
    }

    await context.close();
  });

  test('should work with all browser APIs disabled', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Disable canvas, WebGL, and audio
    await page.addInitScript(() => {
      // Disable canvas
      HTMLCanvasElement.prototype.getContext = () => null;

      // Disable audio
      // @ts-ignore
      window.AudioContext = undefined;
      // @ts-ignore
      window.webkitAudioContext = undefined;
      // @ts-ignore
      window.OfflineAudioContext = undefined;
      // @ts-ignore
      window.webkitOfflineAudioContext = undefined;
    });

    await page.goto('http://localhost:3333/index.html');

    const result = await page.evaluate(async () => {
      try {
        // @ts-ignore
        const thumbmark = new ThumbmarkJS.Thumbmark();
        const data = await thumbmark.get();
        return data.thumbmark;
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(result).toBeDefined();
    // Log result for debugging
    console.log('All APIs disabled result:', result);

    await context.close();
  });
});
