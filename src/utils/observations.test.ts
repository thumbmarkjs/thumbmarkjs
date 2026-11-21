import { collectObservations, ObservationsInterface, PROBES } from './observations';

type Obj = Record<string, unknown>;

/** Runs the collection to completion with every key enabled unless `exclude` says otherwise. */
const collect = async (exclude: string[] = []): Promise<ObservationsInterface> =>
    (await collectObservations({ exclude }))!;

/**
 * Like collect(), but from a freshly loaded module, so the per-page-load WebGL
 * memo starts empty. Needed by every test that depends on the WebGL probe.
 */
async function collectFresh(exclude: string[] = []): Promise<ObservationsInterface> {
    let result!: ObservationsInterface;
    await jest.isolateModulesAsync(async () => {
        const fresh = await import('./observations');
        result = (await fresh.collectObservations({ exclude }))!;
    });
    return result;
}

/** Defines an own property for the length of one test; restored in afterEach. */
const restorers: (() => void)[] = [];
function fake(target: object, name: string, descriptor: PropertyDescriptor) {
    const original = Object.getOwnPropertyDescriptor(target, name);
    Object.defineProperty(target, name, { configurable: true, ...descriptor });
    restorers.push(() => {
        if (original) Object.defineProperty(target, name, original);
        else delete (target as Obj)[name];
    });
}

beforeEach(() => {
    // jsdom has no canvas: report "no context" quietly instead of logging "not implemented".
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
    restorers.splice(0).reverse().forEach(restore => restore());
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('collectObservations', () => {
    test('always carries the schema version, even when nothing else is determinable', async () => {
        expect(await collect()).toMatchObject({ v: 1 });
        const everyKeyExcluded = [
            'webglVendorUnmasked', 'webglRendererUnmasked', 'webdriver', 'automationGlobals',
            'engineApiMarkers', 'navigatorAccessorOverrides', 'getterNativeSourceTamper', 'hardwareConcurrency',
            'overriddenPrototypeMethods', 'adBaitBlocked', 'canvasReadbackDiffBytes',
        ].map(key => `observations.${key}`);
        expect(await collect(everyKeyExcluded)).toEqual({ v: 1 });
    });

    test('exclude: ["observations"] collects nothing and returns no promise', () => {
        const probe = jest.fn(() => 4);
        fake(navigator, 'hardwareConcurrency', { get: probe });
        expect(collectObservations({ exclude: ['observations'] })).toBeUndefined();
        expect(probe).not.toHaveBeenCalled();
    });

    test('a probe that throws omits only its own key', async () => {
        fake(navigator, 'webdriver', { get() { throw new Error('boom'); } });
        fake(navigator, 'hardwareConcurrency', { value: 6 });
        const result = await collect();
        expect('webdriver' in result).toBe(false);
        expect(result.hardwareConcurrency).toBe(6);
        expect(result.v).toBe(1);
    });

    describe('per-key exclude skips the probe', () => {
        test('sync navigator probes', async () => {
            const webdriver = jest.fn(() => true);
            const concurrency = jest.fn(() => 8);
            fake(navigator, 'webdriver', { get: webdriver });
            fake(navigator, 'hardwareConcurrency', { get: concurrency });
            const result = await collect(['observations.webdriver', 'observations.hardwareConcurrency']);
            expect(webdriver).not.toHaveBeenCalled();
            expect(concurrency).not.toHaveBeenCalled();
            expect('webdriver' in result).toBe(false);
            expect('hardwareConcurrency' in result).toBe(false);
        });

        test('ad bait does not touch the document', async () => {
            const append = jest.spyOn(document.body, 'appendChild');
            const result = await collect(['observations.adBaitBlocked']);
            expect(append).not.toHaveBeenCalled();
            expect('adBaitBlocked' in result).toBe(false);
        });

        test('canvas readback creates no canvas', async () => {
            const createElement = jest.spyOn(document, 'createElement');
            const result = await collect(['observations.canvasReadbackDiffBytes', 'observations.webglVendorUnmasked', 'observations.webglRendererUnmasked', 'observations.adBaitBlocked']);
            expect(createElement).not.toHaveBeenCalledWith('canvas');
            expect('canvasReadbackDiffBytes' in result).toBe(false);
        });

        test('webgl creates no context when both keys are excluded, and one key still works alone', async () => {
            const { getContext, restore } = mockWebgl();
            const none = await collectFresh(['observations.webglVendorUnmasked', 'observations.webglRendererUnmasked']);
            expect(getContext).not.toHaveBeenCalledWith('webgl');
            expect('webglVendorUnmasked' in none).toBe(false);
            expect('webglRendererUnmasked' in none).toBe(false);

            const one = await collectFresh(['observations.webglRendererUnmasked']);
            expect(one.webglVendorUnmasked).toBe('Fake Vendor Inc.');
            expect('webglRendererUnmasked' in one).toBe(false);
            restore();
        });
    });

    describe('webdriver', () => {
        test.each([true, false])('reports navigator.webdriver as-is (%s)', async value => {
            fake(navigator, 'webdriver', { value });
            expect((await collect()).webdriver).toBe(value);
        });

        test('is omitted when it is not a boolean', async () => {
            fake(navigator, 'webdriver', { value: undefined });
            expect('webdriver' in (await collect())).toBe(false);
            fake(navigator, 'webdriver', { value: 'yes' });
            expect('webdriver' in (await collect())).toBe(false);
        });
    });

    describe('hardwareConcurrency', () => {
        test('reports the raw number', async () => {
            fake(navigator, 'hardwareConcurrency', { value: 12 });
            expect((await collect()).hardwareConcurrency).toBe(12);
        });

        test('is omitted when not a finite number', async () => {
            fake(navigator, 'hardwareConcurrency', { value: undefined });
            expect('hardwareConcurrency' in (await collect())).toBe(false);
        });
    });

    describe('automationGlobals', () => {
        test('lists legacy driver globals and cdc_ prefixed ones', async () => {
            fake(globalThis, 'callPhantom', { value: () => undefined });
            fake(globalThis, 'cdc_adoQpoasnfa76pfcZLmcfl_Array', { value: [] });
            fake(globalThis, '$cdc_asdjflasutopfhvcZLmcfl_', { value: 1 });
            expect((await collect()).automationGlobals).toEqual(
                ['callPhantom', 'cdc_adoQpoasnfa76pfcZLmcfl_Array', '$cdc_asdjflasutopfhvcZLmcfl_'],
            );
        });

        test('is an empty list on a clean global object', async () => {
            expect((await collect()).automationGlobals).toEqual([]);
        });
    });

    describe('engineApiMarkers', () => {
        test('reports every engine whose marker is present', async () => {
            fake(window, 'chrome', { value: {} });
            fake(window, 'safari', { value: {} });
            fake(globalThis, 'CSS', { value: { supports: (property: string) => property === '-moz-appearance' } });
            expect((await collect()).engineApiMarkers).toEqual(['blink', 'gecko', 'webkit']);
        });

        test('is an empty list when no marker is present, and a throwing marker casts no vote', async () => {
            expect((await collect()).engineApiMarkers).toEqual([]);
            fake(globalThis, 'CSS', { value: { supports() { throw new Error('nope'); } } });
            expect((await collect()).engineApiMarkers).toEqual([]);
        });

        test('does not compare against the user agent', async () => {
            fake(navigator, 'userAgent', { value: 'Mozilla/5.0 Firefox/130.0' });
            fake(window, 'chrome', { value: {} });
            // The raw marker is reported; no mismatch is derived.
            expect(await collect()).toEqual(expect.objectContaining({ engineApiMarkers: ['blink'] }));
            expect(Object.keys(await collect())).not.toContain('engineUaMismatch');
        });
    });

    describe('navigatorAccessorOverrides', () => {
        test('lists accessors flattened onto the navigator instance', async () => {
            fake(navigator, 'platform', { value: 'Spoofed' });
            fake(navigator, 'language', { value: 'xx' });
            expect((await collect()).navigatorAccessorOverrides).toEqual(['platform', 'language']);
        });

        test('is an empty list on an untouched navigator', async () => {
            expect((await collect()).navigatorAccessorOverrides).toEqual([]);
        });
    });

    describe('getterNativeSourceTamper', () => {
        test('lists prototype getters that accept a foreign receiver', async () => {
            fake(Object.getPrototypeOf(navigator), 'hardwareConcurrency', { get: () => 8 });
            expect((await collect()).getterNativeSourceTamper).toEqual(['hardwareConcurrency']);
        });

        test('a getter that throws for a foreign receiver is clean (native brand check)', async () => {
            fake(Object.getPrototypeOf(navigator), 'platform', {
                get() { if (!(this instanceof Navigator)) throw new TypeError('Illegal invocation'); return 'x'; },
            });
            expect((await collect()).getterNativeSourceTamper).toEqual([]);
        });

        test('missing accessor descriptors are skipped', async () => {
            fake(Object.getPrototypeOf(navigator), 'language', { value: 'en' });
            expect((await collect()).getterNativeSourceTamper).toEqual([]);
        });
    });

    describe('overriddenPrototypeMethods', () => {
        test('lists a prototype-only method that is an own property', async () => {
            fake(document, 'createElement', { value: document.createElement.bind(document) });
            expect((await collect()).overriddenPrototypeMethods).toEqual(['createElement']);
        });

        test('is an empty list for untouched built-ins', async () => {
            expect((await collect()).overriddenPrototypeMethods).toEqual([]);
        });
    });

    describe('adBaitBlocked', () => {
        const bait = 'ad-banner ad-container ad-slot banner-ad text-ad sponsored-ad google-ad ad-unit'.split(' ');

        test('lists the bait classes that collapse (jsdom does no layout, so all do)', async () => {
            expect((await collect()).adBaitBlocked).toEqual(bait);
        });

        test('is an empty list when nothing collapses', async () => {
            fake(HTMLElement.prototype, 'offsetWidth', { get: () => 2 });
            fake(HTMLElement.prototype, 'offsetHeight', { get: () => 2 });
            fake(HTMLElement.prototype, 'offsetParent', { get() { return document.body; } });
            expect((await collect()).adBaitBlocked).toEqual([]);
        });

        test('leaves the page untouched, uses class names only, and reads layout after a single insertion', async () => {
            const before = document.body.innerHTML;
            const seen: string[] = [];
            const append = jest.spyOn(document.body, 'appendChild').mockImplementation(function (this: Node, node) {
                seen.push((node as HTMLElement).outerHTML);
                return Node.prototype.appendChild.call(this, node) as typeof node;
            });
            await collect();
            expect(append).toHaveBeenCalledTimes(1);
            expect(seen[0]).not.toMatch(/\sid=/);
            expect(document.body.innerHTML).toBe(before);
        });

        test('removes the container even when a layout read throws', async () => {
            const before = document.body.innerHTML;
            fake(HTMLElement.prototype, 'offsetParent', { get() { throw new Error('layout'); } });
            expect('adBaitBlocked' in (await collect())).toBe(false);
            expect(document.body.innerHTML).toBe(before);
        });

        test('is omitted when there is no document.body', async () => {
            jest.spyOn(document, 'body', 'get').mockReturnValue(null as unknown as HTMLElement);
            expect('adBaitBlocked' in (await collect())).toBe(false);
        });
    });

    describe('canvasReadbackDiffBytes', () => {
        /** A 2d context whose two getImageData reads return the given byte arrays. */
        function mockCanvas2d(reads: Uint8ClampedArray[]) {
            const ctx = {
                fillRect: jest.fn(), beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(),
                getImageData: jest.fn(() => ({ data: reads.shift() })),
            };
            const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
                .mockImplementation(((type: string) => type === '2d' ? ctx : null) as typeof HTMLCanvasElement.prototype.getContext);
            return { ctx, getContext };
        }
        const pixels = () => new Uint8ClampedArray(16 * 16 * 4);

        test('is 0 when both reads are identical, and the canvas is drawn off-screen with the readback hint', async () => {
            const before = document.body.innerHTML;
            const { ctx, getContext } = mockCanvas2d([pixels(), pixels()]);
            expect((await collect()).canvasReadbackDiffBytes).toBe(0);
            expect(getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true });
            expect(ctx.getImageData).toHaveBeenCalledTimes(2);
            expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 16, 16);
            expect(document.body.innerHTML).toBe(before);
        });

        test('counts the bytes that differ between the two reads', async () => {
            const noisy = pixels();
            [0, 5, 9, 200, 1023].forEach(i => { noisy[i] = 1; });
            mockCanvas2d([pixels(), noisy]);
            expect((await collect()).canvasReadbackDiffBytes).toBe(5);
        });

        test('uses the longer length when the reads differ in size', async () => {
            mockCanvas2d([new Uint8ClampedArray(8), new Uint8ClampedArray(12)]);
            expect((await collect()).canvasReadbackDiffBytes).toBe(12);
        });

        test('is omitted when there is no 2d context', async () => {
            expect('canvasReadbackDiffBytes' in (await collect())).toBe(false);
        });

        test('is omitted when a canvas call throws', async () => {
            const { ctx } = mockCanvas2d([]);
            ctx.getImageData.mockImplementation(() => { throw new Error('blocked'); });
            const result = await collect();
            expect('canvasReadbackDiffBytes' in result).toBe(false);
            expect(result.v).toBe(1);
        });
    });

    describe('webgl unmasked strings', () => {
        test('reads the unmasked vendor and renderer through the debug extension', async () => {
            const { getContext, gl, restore } = mockWebgl();
            const result = await collectFresh();
            expect(result.webglVendorUnmasked).toBe('Fake Vendor Inc.');
            expect(result.webglRendererUnmasked).toBe('Fake Renderer 9000');
            expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_debug_renderer_info');
            expect(getContext).toHaveBeenCalledWith('webgl');
            restore();
        });

        test('on Gecko reads VENDOR/RENDERER and never calls getExtension (it logs a deprecation warning there)', async () => {
            fake(document.documentElement.style, 'MozAppearance', { value: '' });
            const { gl, restore } = mockWebgl();
            const result = await collectFresh();
            expect(result.webglVendorUnmasked).toBe('Masked Vendor');
            expect(result.webglRendererUnmasked).toBe('Masked Renderer');
            expect(gl.getParameter).toHaveBeenCalledWith(gl.VENDOR);
            expect(gl.getParameter).toHaveBeenCalledWith(gl.RENDERER);
            expect(gl.getExtension).not.toHaveBeenCalled();
            restore();
        });

        test('on Gecko an empty VENDOR or RENDERER is omitted', async () => {
            fake(document.documentElement.style, 'MozAppearance', { value: '' });
            const { gl, restore } = mockWebgl();
            gl.getParameter.mockImplementation((parameter: number) => parameter === gl.RENDERER ? 'Masked Renderer' : '');
            const result = await collectFresh();
            expect('webglVendorUnmasked' in result).toBe(false);
            expect(result.webglRendererUnmasked).toBe('Masked Renderer');
            restore();
        });

        test('off Gecko the extension is used and the plain VENDOR/RENDERER are not reported', async () => {
            expect('MozAppearance' in document.documentElement.style).toBe(false);
            const { gl, restore } = mockWebgl();
            const result = await collectFresh();
            expect(result.webglVendorUnmasked).toBe('Fake Vendor Inc.');
            expect(result.webglRendererUnmasked).toBe('Fake Renderer 9000');
            expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_debug_renderer_info');
            expect(gl.getParameter).not.toHaveBeenCalledWith(gl.VENDOR);
            restore();
        });

        test('reads the unmasked strings even when the masked ones are usable, with at most one context per page load', async () => {
            const { gl, getContext, restore } = mockWebgl();
            gl.getParameter.mockImplementation((parameter: number) =>
                parameter === 1 ? 'Unmasked Vendor' : parameter === 2 ? 'Unmasked Renderer' : 'Intel Inc.');
            await jest.isolateModulesAsync(async () => {
                const fresh = await import('./observations');
                const results = [
                    await fresh.collectObservations({ exclude: [] }),
                    await fresh.collectObservations({ exclude: [] }),
                    await fresh.collectObservations({ exclude: [] }),
                ];
                results.forEach(result => expect(result).toMatchObject({
                    webglVendorUnmasked: 'Unmasked Vendor', webglRendererUnmasked: 'Unmasked Renderer',
                }));
            });
            expect(getContext.mock.calls.filter(([type]) => type === 'webgl')).toHaveLength(1);
            restore();
        });

        test('omits both keys when WEBGL_debug_renderer_info is missing, and never loses the context', async () => {
            const { gl, restore } = mockWebgl({ extension: null });
            const result = await collectFresh();
            expect('webglVendorUnmasked' in result).toBe(false);
            expect('webglRendererUnmasked' in result).toBe(false);
            expect(gl.getExtension).not.toHaveBeenCalledWith('WEBGL_lose_context');
            restore();
        });

        test('omits a key whose unmasked string is empty', async () => {
            const { restore } = mockWebgl({ vendor: '' });
            const result = await collectFresh();
            expect('webglVendorUnmasked' in result).toBe(false);
            expect(result.webglRendererUnmasked).toBe('Fake Renderer 9000');
            restore();
        });

        test('omits both keys when no WebGL context can be created (jsdom default)', async () => {
            const result = await collectFresh();
            expect('webglVendorUnmasked' in result).toBe(false);
            expect('webglRendererUnmasked' in result).toBe(false);
        });

        test('a throwing context creation omits the keys without throwing', async () => {
            jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('blocked'); });
            const result = await collectFresh();
            expect(result.v).toBe(1);
            expect('webglVendorUnmasked' in result).toBe(false);
        });
    });

    describe('deadlines', () => {
        const hang = () => new Promise(() => undefined);

        /** Swaps one probe for the length of a test, so a slow one can be simulated. */
        function slowProbe(probe: () => unknown) {
            const original = PROBES.adBaitBlocked;
            PROBES.adBaitBlocked = probe;
            restorers.push(() => { PROBES.adBaitBlocked = original; });
        }

        /** An adBaitBlocked whose result stays pending until the returned function is called. */
        function pendingProbe() {
            let resolve!: (value: string[]) => void;
            slowProbe(() => new Promise(r => { resolve = r; }));
            return (value: string[]) => resolve(value);
        }

        test('a never-resolving probe is omitted at the 50 ms deadline, and no timers are left behind', async () => {
            jest.useFakeTimers();
            slowProbe(hang);
            fake(navigator, 'hardwareConcurrency', { value: 4 });
            let result: ObservationsInterface | undefined;
            collectObservations({ exclude: [] })!.then(r => { result = r; });
            await jest.advanceTimersByTimeAsync(49);
            expect(result).toBeUndefined();
            await jest.advanceTimersByTimeAsync(1);
            expect(result).toBeDefined();
            expect('adBaitBlocked' in result!).toBe(false);
            expect(result!.hardwareConcurrency).toBe(4);
            expect(jest.getTimerCount()).toBe(0);
        });

        test('a probe that resolves after the deadline is not in the collection promise, but is in a later snapshot', async () => {
            jest.useFakeTimers();
            const resolveProbe = pendingProbe();
            const collection = collectObservations({ exclude: [] })!;
            let result: ObservationsInterface | undefined;
            collection.then(r => { result = r; });
            await jest.advanceTimersByTimeAsync(50);
            expect(result).toBeDefined();
            resolveProbe(['ad-banner']);
            await jest.advanceTimersByTimeAsync(0);
            expect('adBaitBlocked' in result!).toBe(false);
            expect((await collection.snapshot()).adBaitBlocked).toEqual(['ad-banner']);
        });

        test('a snapshot taken before the deadline waits for a pending key only until the deadline', async () => {
            jest.useFakeTimers();
            pendingProbe();
            const collection = collectObservations({ exclude: [] })!;
            await jest.advanceTimersByTimeAsync(20);
            let snapshot: ObservationsInterface | undefined;
            collection.snapshot().then(r => { snapshot = r; });
            await jest.advanceTimersByTimeAsync(29);
            expect(snapshot).toBeUndefined();
            await jest.advanceTimersByTimeAsync(1);
            expect(snapshot).toMatchObject({ v: 1, automationGlobals: [] });
            expect('adBaitBlocked' in snapshot!).toBe(false);
        });

        test('a snapshot taken after the deadline does not wait', async () => {
            jest.useFakeTimers();
            pendingProbe();
            const collection = collectObservations({ exclude: [] })!;
            await jest.advanceTimersByTimeAsync(80);
            let snapshot: ObservationsInterface | undefined;
            collection.snapshot().then(r => { snapshot = r; });
            await jest.advanceTimersByTimeAsync(0);
            expect(snapshot).toMatchObject({ v: 1 });
        });

        test('resolves as soon as every key has settled, without waiting for the deadline', async () => {
            jest.useFakeTimers();
            let result: ObservationsInterface | undefined;
            collectObservations({ exclude: [] })!.then(r => { result = r; });
            await jest.advanceTimersByTimeAsync(0);
            expect(result).toBeDefined();
            expect(jest.getTimerCount()).toBe(0);
        });
    });
});

/** A minimal fake WebGL context, installed for 'webgl' only (2d stays unsupported). */
function mockWebgl(overrides: { extension?: null, vendor?: string } = {}) {
    const ext = { UNMASKED_VENDOR_WEBGL: 1, UNMASKED_RENDERER_WEBGL: 2 };
    const gl = {
        VENDOR: 7936,
        RENDERER: 7937,
        getExtension: jest.fn((name: string) => name === 'WEBGL_debug_renderer_info' && overrides.extension !== null ? ext : null),
        getParameter: jest.fn((parameter: number) =>
            parameter === 1 ? (overrides.vendor ?? 'Fake Vendor Inc.')
                : parameter === 2 ? 'Fake Renderer 9000'
                    : parameter === 7936 ? 'Masked Vendor'
                        : parameter === 7937 ? 'Masked Renderer' : 'WebKit WebGL'),
    };
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockImplementation(((type: string) => type === 'webgl' ? gl : null) as typeof HTMLCanvasElement.prototype.getContext);
    return { gl, getContext, restore: () => getContext.mockRestore() };
}
