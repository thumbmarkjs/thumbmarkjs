import { getThumbmark } from '.';
import { getApiPromise } from './api';
import { defaultOptions, OptionsAfterDefaults } from '../options';
import { hash } from '../utils/hash';
import { stableStringify } from '../utils/stableStringify';
import { collectObservations, ObservationsInterface } from '../utils/observations';
import { setCache } from '../utils/cache';
import { logThumbmarkData } from '../utils/log';
import { __resetBrowserCache } from '../components/system/browser';
import type { componentInterface } from '../factory';

jest.mock('../utils/collect', () => ({ sendCollectBeacon: jest.fn() }));
jest.mock('../utils/observations', () => {
    const actual = jest.requireActual('../utils/observations');
    return { ...actual, collectObservations: jest.fn(actual.collectObservations) };
});

type Body = {
    components: componentInterface,
    options: Record<string, unknown>,
    clientHash: string,
    observations?: ObservationsInterface & Record<string, unknown>,
    [key: string]: unknown,
};

const apiOptions = { ...defaultOptions, api_key: 'test-key', cache_api_call: false };
const collectSpy = collectObservations as jest.Mock;

let fetchMock: jest.Mock;
const sentBodies = (): Body[] => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

beforeEach(() => {
    collectSpy.mockClear();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ info: {} }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    delete (navigator as unknown as Record<string, unknown>).brave;
    __resetBrowserCache();
});

describe('observations in the API request body', () => {
    test('is a sibling of components, with version 1', async () => {
        await getThumbmark(apiOptions);
        const [body] = sentBodies();
        expect(body.observations).toMatchObject({ v: 1, automationGlobals: [], engineApiMarkers: [] });
        expect(Object.keys(body)).toEqual(expect.arrayContaining(['components', 'observations', 'clientHash', 'path']));
        expect(body.components).not.toHaveProperty('observations');
    });

    test('is sent with simple_request too', async () => {
        await getThumbmark({ ...defaultOptions, simple_request: true, cache_api_call: false });
        expect(sentBodies()[0].observations).toMatchObject({ v: 1 });
    });

    test('clientHash is the hash of the components only', async () => {
        await getThumbmark(apiOptions);
        const [body] = sentBodies();
        expect(body.clientHash).toBe(hash(stableStringify(body.components)));
    });

    test('is not part of the returned response or its components', async () => {
        const result = await getThumbmark(apiOptions);
        expect(result).not.toHaveProperty('observations');
        expect(result.components).not.toHaveProperty('observations');
        expect(JSON.stringify(result)).not.toContain('"observations"');
    });

    test('still sends { v: 1 } when no key could be determined', async () => {
        const every = [
            'webglVendorUnmasked', 'webglRendererUnmasked', 'mediaDecode', 'webdriver', 'automationGlobals',
            'engineApiMarkers', 'navigatorAccessorOverrides', 'getterNativeSourceTamper', 'hardwareConcurrency',
            'overriddenPrototypeMethods', 'adBaitBlocked',
        ];
        await getThumbmark({ ...apiOptions, exclude: every.map(key => `observations.${key}`) });
        expect(sentBodies()[0].observations).toEqual({ v: 1 });
    });
});

describe('hash invariance', () => {
    test('the thumbmark and clientHash are identical with default options and with exclude: ["observations"]', async () => {
        const withObservations = await getThumbmark(apiOptions);
        const without = await getThumbmark({ ...apiOptions, exclude: ['observations'] });
        const [first, second] = sentBodies();

        expect(first.observations).toBeDefined();
        expect(second).not.toHaveProperty('observations');
        expect(first.clientHash).toBe(second.clientHash);
        expect(first.components).toEqual(second.components);
        expect(withObservations.thumbmark).toBe(without.thumbmark);
        expect(withObservations.thumbmark).toBe(first.clientHash);
    });

    test('matches a run that makes no API call at all', async () => {
        const offline = await getThumbmark({ ...defaultOptions });
        await getThumbmark(apiOptions);
        expect(offline.thumbmark).toBe(sentBodies()[0].clientHash);
    });
});

describe('exclude and stabilize', () => {
    test('exclude: ["observations"] collects nothing and sends no observations key', async () => {
        // The observation getters are the only thing in this test that would read it.
        const webdriver = jest.fn(() => false);
        Object.defineProperty(navigator, 'webdriver', { get: webdriver, configurable: true });
        try {
            await getThumbmark({ ...apiOptions, exclude: ['observations'] });
        } finally {
            delete (navigator as unknown as Record<string, unknown>).webdriver;
        }
        expect(collectSpy.mock.results.every(result => result.value === undefined)).toBe(true);
        expect(webdriver).not.toHaveBeenCalled();
        expect(sentBodies()[0]).not.toHaveProperty('observations');
    });

    test('exclude: ["observations.<key>"] omits that key and keeps the others', async () => {
        await getThumbmark({ ...apiOptions, exclude: ['observations.adBaitBlocked', 'observations.hardwareConcurrency'] });
        const { observations } = sentBodies()[0];
        expect(observations).toBeDefined();
        expect(observations).not.toHaveProperty('adBaitBlocked');
        expect(observations).not.toHaveProperty('hardwareConcurrency');
        expect(observations).toHaveProperty('automationGlobals');
    });

    test('stabilize does not strip observations (hardwareConcurrency survives where the component drops it)', async () => {
        // Brave is the case stabilize 'private' drops system.hardwareConcurrency for.
        Object.defineProperty(navigator, 'brave', { value: { isBrave: () => Promise.resolve(true) }, configurable: true });
        __resetBrowserCache();
        const options = { ...apiOptions, stabilize: ['private', 'iframe'] };
        const result = await getThumbmark(options);
        const [body] = sentBodies();
        expect((result.components.system as componentInterface).hardwareConcurrency).toBeUndefined();
        expect(body.observations!.hardwareConcurrency).toBe(navigator.hardwareConcurrency);
    });

    test('include does not restrict observations', async () => {
        await getThumbmark({ ...apiOptions, include: ['math'] });
        expect(Object.keys(sentBodies()[0].components)).toEqual(['math']);
        expect(sentBodies()[0].observations).toHaveProperty('automationGlobals');
    });
});

describe('when collection happens', () => {
    test('not at all when no API call will be made', async () => {
        await getThumbmark({ ...defaultOptions });
        expect(collectSpy).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('before the components resolve, in parallel with them', async () => {
        let collectedBeforeComponents = false;
        await getThumbmark(apiOptions, {
            probe: async () => {
                collectedBeforeComponents = collectSpy.mock.calls.length === 1;
                return { ok: 'yes' } as componentInterface;
            },
        });
        expect(collectedBeforeComponents).toBe(true);
        expect(collectSpy).toHaveBeenCalledTimes(1);
    });

    describe('with caching on', () => {
        const cachedOptions = { ...apiOptions, cache_api_call: true, cache_lifetime_in_ms: 60_000 };

        test('not when the localStorage cache will serve the response', async () => {
            await jest.isolateModulesAsync(async () => {
                const { getThumbmark: fresh } = await import('.');
                const { collectObservations: freshCollect } = await import('../utils/observations');
                setCache(cachedOptions, { apiResponseExpiry: Date.now() + 60_000, apiResponse: { info: {} } });
                await fresh(cachedOptions);
                expect(freshCollect).not.toHaveBeenCalled();
                expect(fetchMock).not.toHaveBeenCalled();
            });
        });

        test('not when the in-memory result will serve it, but once for the first request', async () => {
            await jest.isolateModulesAsync(async () => {
                const { getThumbmark: fresh } = await import('.');
                const { collectObservations: freshCollect } = await import('../utils/observations');
                await fresh({ ...cachedOptions, cache_lifetime_in_ms: 0 });
                await fresh({ ...cachedOptions, cache_lifetime_in_ms: 0 });
                expect(fetchMock).toHaveBeenCalledTimes(1);
                expect(freshCollect).toHaveBeenCalledTimes(1);
            });
        });

        test('not when an identical request is already in flight', async () => {
            await jest.isolateModulesAsync(async () => {
                const api = await import('./api');
                fetchMock.mockReturnValue(new Promise(() => undefined));
                const opts = { ...cachedOptions, cache_lifetime_in_ms: 0 } as OptionsAfterDefaults;
                expect(api.isApiServedFromCache(opts)).toBe(false);
                void api.getApiPromise(opts, {});
                expect(api.isApiServedFromCache(opts)).toBe(true);
            });
        });
    });
});

describe('getApiPromise with pending observations', () => {
    const options = { ...apiOptions, timeout: 5000 } as OptionsAfterDefaults;
    const hang = () => new Promise(() => undefined);
    const withMedia = (decodingInfo: () => Promise<unknown>) =>
        Object.defineProperty(navigator, 'mediaCapabilities', { value: { decodingInfo }, configurable: true });
    afterEach(() => { delete (navigator as unknown as Record<string, unknown>).mediaCapabilities; });

    test('a probe still pending at the deadline is omitted and the request goes out at 500 ms, not the 5 s timeout', async () => {
        jest.useFakeTimers();
        withMedia(hang);
        const response = getApiPromise(options, { a: 1 } as componentInterface, collectObservations(options));
        await jest.advanceTimersByTimeAsync(499);
        expect(fetchMock).not.toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [body] = sentBodies();
        expect(body.observations).toMatchObject({ v: 1, automationGlobals: [] });
        expect(body.observations).not.toHaveProperty('mediaDecode');
        await expect(response).resolves.toEqual({ info: {} });
    });

    test('a probe that resolves after the deadline but before the request is built is included, with no wait', async () => {
        jest.useFakeTimers();
        const resolvers: ((value: unknown) => void)[] = [];
        withMedia(() => new Promise(resolve => { resolvers.push(resolve); }));
        const collection = collectObservations(options)!;
        await jest.advanceTimersByTimeAsync(700);
        resolvers.forEach(resolve => resolve({ supported: true }));
        await jest.advanceTimersByTimeAsync(0);
        void getApiPromise(options, {}, collection);
        await jest.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sentBodies()[0].observations!.mediaDecode).toContain('h264:supported');
    });

    test('a request built after the deadline does not wait for a pending probe', async () => {
        jest.useFakeTimers();
        withMedia(hang);
        const collection = collectObservations(options)!;
        await jest.advanceTimersByTimeAsync(700);
        void getApiPromise(options, {}, collection);
        await jest.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sentBodies()[0].observations).not.toHaveProperty('mediaDecode');
    });

    test('waits for a probe that resolves before the deadline and includes it', async () => {
        jest.useFakeTimers();
        withMedia(() => new Promise(resolve => setTimeout(() => resolve({ supported: true }), 100)));
        void getApiPromise(options, {}, collectObservations(options));
        await jest.advanceTimersByTimeAsync(99);
        expect(fetchMock).not.toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sentBodies()[0].observations!.mediaDecode).toContain('h264:supported');
    });

    test('keys that resolved before the request is built are included without any wait', async () => {
        const pending = collectObservations(options)!;
        await pending;
        void getApiPromise(options, {}, pending);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sentBodies()[0].observations).toMatchObject({ v: 1, automationGlobals: [] });
    });

    test('a collection that rejects sends the request without observations', async () => {
        await getApiPromise(options, {}, { snapshot: () => Promise.reject(new Error('boom')) });
        expect(sentBodies()[0]).not.toHaveProperty('observations');
    });

    test('without observations the request is built and sent synchronously, as before', () => {
        void getApiPromise(options, {});
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sentBodies()[0]).not.toHaveProperty('observations');
    });

    test('a probe that throws omits only its own key from the request', async () => {
        Object.defineProperty(navigator, 'webdriver', { get() { throw new Error('boom'); }, configurable: true });
        try {
            await getApiPromise(options, {}, collectObservations(options));
        } finally {
            delete (navigator as unknown as Record<string, unknown>).webdriver;
        }
        const { observations } = sentBodies()[0];
        expect(observations).not.toHaveProperty('webdriver');
        expect(observations).toHaveProperty('automationGlobals');
    });
});

describe('observations in the sampled log', () => {
    const logOptions = { ...defaultOptions, cache_api_call: false };
    const isLog = ([url]: [string]) => url.includes('/log');
    const logBodies = (): Body[] => fetchMock.mock.calls.filter(isLog).map(([, init]) => JSON.parse(init.body));
    const apiBodies = (): Body[] => fetchMock.mock.calls.filter(call => !isLog(call) && call[1]?.method === 'POST').map(([, init]) => JSON.parse(init.body));
    // The log is fire-and-forget, so let it settle before inspecting what was sent.
    const flush = () => new Promise(resolve => setTimeout(resolve, 50));
    const sample = (value: number) => jest.spyOn(Math, 'random').mockReturnValue(value);

    beforeEach(() => {
        sessionStorage.clear();
        fetchMock.mockImplementation((url: string) => url.includes('experimental.thumbmarkjs.com')
            ? Promise.reject(new TypeError('Failed to fetch'))
            : Promise.resolve({ ok: true, status: 200, json: async () => ({ info: {} }) }));
    });
    afterEach(() => sessionStorage.clear());

    test('a sampled run without an api_key collects once and logs observations next to components', async () => {
        sample(0);
        await getThumbmark(logOptions);
        await flush();
        expect(collectSpy).toHaveBeenCalledTimes(1);
        const [body] = logBodies();
        expect(body.observations).toMatchObject({ v: 1, automationGlobals: [], engineApiMarkers: [] });
        expect(Object.keys(body)).toEqual(expect.arrayContaining(['components', 'observations', 'thumbmark']));
        expect(body.components).not.toHaveProperty('observations');
        expect(apiBodies()).toHaveLength(0);
    });

    test('an unsampled run without an api_key collects nothing and logs nothing', async () => {
        sample(0.5);
        await getThumbmark(logOptions);
        await flush();
        expect(collectSpy).not.toHaveBeenCalled();
        expect(logBodies()).toHaveLength(0);
    });

    test('logging: false does not start collection by itself', async () => {
        sample(0);
        await getThumbmark({ ...logOptions, logging: false });
        await flush();
        expect(collectSpy).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('with an API call and a sampled log, one collection feeds both bodies', async () => {
        sample(0);
        await getThumbmark(apiOptions);
        await flush();
        expect(collectSpy).toHaveBeenCalledTimes(1);
        expect(apiBodies()).toHaveLength(1);
        expect(logBodies()).toHaveLength(1);
        expect(apiBodies()[0].observations).toMatchObject({ v: 1 });
        expect(logBodies()[0].observations).toMatchObject({ v: 1 });
    });

    test('exclude: ["observations"] leaves the key out of the log and collects nothing', async () => {
        sample(0);
        await getThumbmark({ ...logOptions, exclude: ['observations'] });
        await flush();
        expect(collectSpy.mock.results.every(result => result.value === undefined)).toBe(true);
        expect(logBodies()).toHaveLength(1);
        expect(logBodies()[0]).not.toHaveProperty('observations');
    });

    test('exclude: ["observations.<key>"] drops that key from the log', async () => {
        sample(0);
        await getThumbmark({ ...logOptions, exclude: ['observations.adBaitBlocked'] });
        await flush();
        expect(logBodies()[0].observations).not.toHaveProperty('adBaitBlocked');
        expect(logBodies()[0].observations).toHaveProperty('automationGlobals');
    });

    test('a rejected snapshot still sends the log, without the key', async () => {
        await logThumbmarkData('abc', { a: { b: 1 } }, defaultOptions, [], { snapshot: () => Promise.reject(new Error('boom')) });
        expect(logBodies()).toHaveLength(1);
        expect(logBodies()[0]).not.toHaveProperty('observations');
        expect(logBodies()[0].components).toEqual({ a: { b: 1 } });
    });

    test('without a collection the log is sent without the key', async () => {
        await logThumbmarkData('abc', {}, defaultOptions);
        expect(logBodies()[0]).not.toHaveProperty('observations');
    });

    test('the thumbmark is the same with and without the log observations', async () => {
        sample(0);
        const logged = await getThumbmark(logOptions);
        await flush();
        sessionStorage.clear();
        const excluded = await getThumbmark({ ...logOptions, exclude: ['observations'] });
        await flush();
        expect(logged.thumbmark).toBe(excluded.thumbmark);
        expect(logged).not.toHaveProperty('observations');
        expect(logBodies()[0].thumbmark).toBe(logged.thumbmark);
    });
});

describe('infoInterface.signals', () => {
    test('accepts a null timezone_country_mismatch and unknown keys', () => {
        const signals: NonNullable<import('./api').infoInterface['signals']> = {
            timezone_country_mismatch: null,
            some_future_signal: { anything: true },
        };
        expect(signals.timezone_country_mismatch).toBeNull();
    });
});
