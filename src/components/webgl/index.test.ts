import getWebGL, { __resetWebGLCache, __getWebGLCache } from './index';

// ---------------------------------------------------------------------------
// Mock ImageData — jsdom does not provide a real implementation
// ---------------------------------------------------------------------------
class MockImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrUndefined?: number, height?: number) {
        if (dataOrWidth instanceof Uint8ClampedArray) {
            this.data = dataOrWidth;
            this.width = widthOrUndefined ?? 1;
            this.height = height ?? 1;
        } else {
            const w = dataOrWidth as number;
            const h = widthOrUndefined ?? 1;
            this.data = new Uint8ClampedArray(w * h * 4);
            this.width = w;
            this.height = h;
        }
    }
}
(global as any).ImageData = MockImageData;

// ---------------------------------------------------------------------------
// WebGL mock factory — returns an object satisfying setupWebGL() and renderImage()
// ---------------------------------------------------------------------------
function makeGlMock(overrides: Partial<WebGLRenderingContext> = {}): WebGLRenderingContext {
    const gl: any = {
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        ARRAY_BUFFER: 34962,
        COMPILE_STATUS: 35713,
        LINK_STATUS: 35714,
        RGBA: 6408,
        UNSIGNED_BYTE: 5121,
        COLOR_BUFFER_BIT: 16384,
        FLOAT: 5126,
        LINES: 1,
        drawingBufferWidth: 200,
        drawingBufferHeight: 100,
        createShader: jest.fn().mockReturnValue({}),
        shaderSource: jest.fn(),
        compileShader: jest.fn(),
        getShaderParameter: jest.fn().mockReturnValue(true),
        createProgram: jest.fn().mockReturnValue({}),
        attachShader: jest.fn(),
        linkProgram: jest.fn(),
        getProgramParameter: jest.fn().mockReturnValue(true),
        createBuffer: jest.fn().mockReturnValue({}),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        useProgram: jest.fn(),
        getAttribLocation: jest.fn().mockReturnValue(0),
        enableVertexAttribArray: jest.fn(),
        vertexAttribPointer: jest.fn(),
        viewport: jest.fn(),
        clearColor: jest.fn(),
        clear: jest.fn(),
        drawArrays: jest.fn(),
        readPixels: jest.fn(),
        ...overrides,
    };
    return gl as WebGLRenderingContext;
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------
let originalGetContext: any;

beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
});

beforeEach(() => {
    __resetWebGLCache();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('webgl component — context-loss recovery', () => {

    // Happy path: cache is populated after first successful call
    test('first getWebGL() call populates the cache', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(makeGlMock()) as any;

        await getWebGL();

        expect(__getWebGLCache()).not.toBeNull();
    });

    // Cache reuse: two calls share the same canvas object
    test('two consecutive getWebGL() calls reuse the same cached canvas', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(makeGlMock()) as any;

        await getWebGL();
        const cacheAfterFirst = __getWebGLCache();
        expect(cacheAfterFirst).not.toBeNull();

        await getWebGL();
        const cacheAfterSecond = __getWebGLCache();

        // Same object reference — no new canvas was created
        expect(cacheAfterSecond).toBe(cacheAfterFirst);
        // getContext called exactly once (canvas created once)
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledTimes(1);
    });

    // Context-loss listener: dispatching webglcontextlost clears the cache
    test('webglcontextlost event clears the cache', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(makeGlMock()) as any;

        await getWebGL();
        const cacheBeforeLoss = __getWebGLCache();
        expect(cacheBeforeLoss).not.toBeNull();

        // Fire the context-lost event on the cached canvas
        cacheBeforeLoss!.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

        expect(__getWebGLCache()).toBeNull();
    });

    // Context-loss listener: event.preventDefault() is called
    test('webglcontextlost listener calls event.preventDefault()', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(makeGlMock()) as any;

        await getWebGL();
        const cache = __getWebGLCache();
        expect(cache).not.toBeNull();

        const lostEvent = new Event('webglcontextlost', { cancelable: true });
        const preventDefaultSpy = jest.spyOn(lostEvent, 'preventDefault');

        cache!.canvas.dispatchEvent(lostEvent);

        expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    // After context loss, next getWebGL() call creates a NEW canvas
    test('getWebGL() after context loss rebuilds the cache via a new canvas', async () => {
        const gl = makeGlMock();
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(gl) as any;

        await getWebGL();
        const firstCache = __getWebGLCache();
        expect(firstCache).not.toBeNull();

        // Simulate context loss
        firstCache!.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
        expect(__getWebGLCache()).toBeNull();

        // Reset mock call count, re-install for rebuild
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(gl) as any;

        await getWebGL();
        const secondCache = __getWebGLCache();
        expect(secondCache).not.toBeNull();
        // A fresh cache object is created — different reference from the lost one
        expect(secondCache).not.toBe(firstCache);
        // getContext called once for the rebuild (new canvas)
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledTimes(1);
    });

    // once: true — the listener fires at most once per canvas
    test('webglcontextlost listener fires only once (once:true)', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(makeGlMock()) as any;

        await getWebGL();
        const firstCache = __getWebGLCache();
        const canvas = firstCache!.canvas;

        // First dispatch: clears cache
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
        expect(__getWebGLCache()).toBeNull();

        // Second dispatch on the same canvas — listener already removed (once:true),
        // so _cache remains null (unchanged) and no throw occurs
        expect(() => {
            canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
        }).not.toThrow();
        expect(__getWebGLCache()).toBeNull();
    });

    // renderImage catch block: render failure clears the cache
    test('render failure (useProgram throws) clears the cache', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(makeGlMock()) as any;

        // First call populates cache
        await getWebGL();
        expect(__getWebGLCache()).not.toBeNull();

        // Patch the cached gl to throw on the next render
        const cache = __getWebGLCache()!;
        (cache as any).gl.useProgram = jest.fn().mockImplementation(() => {
            throw new Error('WebGL context lost');
        });

        // The call should not throw; it should return the 'unsupported' fallback
        const result = await getWebGL();
        expect(result).toEqual({ webgl: 'unsupported' });

        // Cache must have been cleared by the catch block
        expect(__getWebGLCache()).toBeNull();
    });

    // Graceful degradation: getContext returns null → returns 'unsupported'
    test('getWebGL() returns unsupported when WebGL context is unavailable', async () => {
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null) as any;

        const result = await getWebGL();

        expect(result).toEqual({ webgl: 'unsupported' });
        expect(__getWebGLCache()).toBeNull();
    });
});
