import { sendCollectBeacon, DEFAULT_COLLECT_ENDPOINT } from './collect';
import { defaultOptions } from '../options';

describe('sendCollectBeacon', () => {
    let sendBeaconMock: jest.Mock;
    let fetchMock: jest.Mock;
    const LONG_UA = 'A'.repeat(600); // > 512 bytes

    beforeAll(() => {
        // jsdom (this project's test environment) does not implement
        // TextEncoder globally; polyfill it the same way src/functions/api.test.ts
        // already does for the same reason.
        if (typeof TextEncoder === 'undefined') {
            const util = require('util');
            global.TextEncoder = util.TextEncoder;
        }
    });

    beforeEach(() => {
        sessionStorage.clear();
        sendBeaconMock = jest.fn(() => true);
        (navigator as any).sendBeacon = sendBeaconMock;
        fetchMock = jest.fn(() => Promise.resolve({ ok: true, status: 200 }));
        global.fetch = fetchMock as unknown as typeof fetch;
        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'jest-test-agent/1.0',
            configurable: true,
        });
    });

    afterEach(() => {
        delete (navigator as any).sendBeacon;
        jest.clearAllMocks();
    });

    test('sends {ua, thumbmark} via sendBeacon to the default endpoint', () => {
        sendCollectBeacon('abc123', defaultOptions);
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
        const [url, body] = sendBeaconMock.mock.calls[0];
        expect(url).toBe(DEFAULT_COLLECT_ENDPOINT);
        expect(JSON.parse(body)).toEqual({ ua: 'jest-test-agent/1.0', thumbmark: 'abc123' });
    });

    test('omits ua when it exceeds 512 bytes, but still sends thumbmark', () => {
        Object.defineProperty(window.navigator, 'userAgent', { value: LONG_UA, configurable: true });
        sendCollectBeacon('abc123', defaultOptions);
        const [, body] = sendBeaconMock.mock.calls[0];
        expect(JSON.parse(body)).toEqual({ thumbmark: 'abc123' });
    });

    test('does not send when thumbmark is empty', () => {
        sendCollectBeacon('', defaultOptions);
        expect(sendBeaconMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('does not send when thumbmark exceeds 64 bytes', () => {
        sendCollectBeacon('a'.repeat(65), defaultOptions);
        expect(sendBeaconMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('respects collect_beacon: false', () => {
        sendCollectBeacon('abc123', { ...defaultOptions, collect_beacon: false });
        expect(sendBeaconMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('still fires when logging: false -- collect_beacon is independent of logging', () => {
        sendCollectBeacon('abc123', { ...defaultOptions, logging: false });
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    });

    test('respects a custom collect_endpoint override, used verbatim', () => {
        sendCollectBeacon('abc123', { ...defaultOptions, collect_endpoint: 'https://proxy.example.com/beacon' });
        const [url] = sendBeaconMock.mock.calls[0];
        expect(url).toBe('https://proxy.example.com/beacon');
    });

    test('includes ja4 and ja4_source when the directive supplies both -- the body key is literally `ja4_source`, never `source`', () => {
        sendCollectBeacon('abc123', defaultOptions, { ja4: 't13d1517h2_8daaf6152771_63ff51340b64', source: 'cloudfront-viewer' });
        const [, body] = sendBeaconMock.mock.calls[0];
        const parsed = JSON.parse(body);
        expect(parsed).toEqual({
            thumbmark: 'abc123',
            ua: 'jest-test-agent/1.0',
            ja4: 't13d1517h2_8daaf6152771_63ff51340b64',
            ja4_source: 'cloudfront-viewer',
        });
        expect(Object.prototype.hasOwnProperty.call(parsed, 'source')).toBe(false);
    });

    test('sends only {ua, thumbmark} when no directive is supplied (legacy collect: true)', () => {
        sendCollectBeacon('abc123', defaultOptions);
        const [, body] = sendBeaconMock.mock.calls[0];
        expect(JSON.parse(body)).toEqual({ ua: 'jest-test-agent/1.0', thumbmark: 'abc123' });
    });

    test('omits ja4 when empty, but keeps the rest of the body intact', () => {
        sendCollectBeacon('abc123', defaultOptions, { ja4: '', source: 'cloudfront-viewer' });
        const [, body] = sendBeaconMock.mock.calls[0];
        expect(JSON.parse(body)).toEqual({ thumbmark: 'abc123', ua: 'jest-test-agent/1.0', ja4_source: 'cloudfront-viewer' });
    });

    test('omits ja4_source when empty, but keeps the rest of the body intact', () => {
        sendCollectBeacon('abc123', defaultOptions, { ja4: 't13d1517h2_8daaf6152771_63ff51340b64', source: '' });
        const [, body] = sendBeaconMock.mock.calls[0];
        expect(JSON.parse(body)).toEqual({ thumbmark: 'abc123', ua: 'jest-test-agent/1.0', ja4: 't13d1517h2_8daaf6152771_63ff51340b64' });
    });

    test('omits ja4 when it exceeds the 64-byte cap, but still sends the rest of the body', () => {
        const overCapJa4 = 'a'.repeat(65);
        sendCollectBeacon('abc123', defaultOptions, { ja4: overCapJa4, source: 'cloudfront-viewer' });
        const [, body] = sendBeaconMock.mock.calls[0];
        const parsed = JSON.parse(body);
        expect(parsed.ja4).toBeUndefined();
        expect(parsed.ja4_source).toBe('cloudfront-viewer');
        expect(parsed.thumbmark).toBe('abc123');
    });

    test('keeps ja4 when it is exactly at the 64-byte cap', () => {
        const atCapJa4 = 'a'.repeat(64);
        sendCollectBeacon('abc123', defaultOptions, { ja4: atCapJa4, source: 'cloudfront-viewer' });
        const [, body] = sendBeaconMock.mock.calls[0];
        const parsed = JSON.parse(body);
        expect(parsed.ja4).toBe(atCapJa4);
    });

    test('omits ja4_source when it exceeds the 32-byte cap, but still sends the rest of the body', () => {
        const overCapSource = 'a'.repeat(33);
        sendCollectBeacon('abc123', defaultOptions, { ja4: 't13d1517h2_8daaf6152771_63ff51340b64', source: overCapSource });
        const [, body] = sendBeaconMock.mock.calls[0];
        const parsed = JSON.parse(body);
        expect(parsed.ja4_source).toBeUndefined();
        expect(parsed.ja4).toBe('t13d1517h2_8daaf6152771_63ff51340b64');
        expect(parsed.thumbmark).toBe('abc123');
    });

    test('keeps ja4_source when it is exactly at the 32-byte cap', () => {
        const atCapSource = 'a'.repeat(32);
        sendCollectBeacon('abc123', defaultOptions, { ja4: 't13d1517h2_8daaf6152771_63ff51340b64', source: atCapSource });
        const [, body] = sendBeaconMock.mock.calls[0];
        const parsed = JSON.parse(body);
        expect(parsed.ja4_source).toBe(atCapSource);
    });

    test('a missing ja4 in the directive never prevents the beacon', () => {
        sendCollectBeacon('abc123', defaultOptions, { source: 'cloudfront-viewer' });
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
        const [, body] = sendBeaconMock.mock.calls[0];
        const parsed = JSON.parse(body);
        expect(parsed.ja4).toBeUndefined();
        expect(parsed.ja4_source).toBe('cloudfront-viewer');
    });

    test('fires at most once per session, even across separate calls (cache-replay proxy)', () => {
        sendCollectBeacon('abc123', defaultOptions);
        sendCollectBeacon('def456', defaultOptions);
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    });

    test('falls back to a CORS-simple, no-cors fetch when sendBeacon is unavailable', async () => {
        delete (navigator as any).sendBeacon;
        sendCollectBeacon('abc123', defaultOptions);
        await Promise.resolve();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(DEFAULT_COLLECT_ENDPOINT);
        expect(init.mode).toBe('no-cors');
        expect(init.headers).toEqual({ 'Content-Type': 'text/plain;charset=UTF-8' });
        expect(Object.keys(init.headers)).toHaveLength(1);
    });

    // Distinct from the "absent" case above -- here sendBeacon exists and is
    // called, but the browser refuses to queue it (backlog full / connect-src
    // CSP block). The fallback must still fire.
    test('falls back to fetch when sendBeacon returns false', async () => {
        sendBeaconMock.mockImplementation(() => false);
        sendCollectBeacon('abc123', defaultOptions);
        await Promise.resolve();
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('never throws when sendBeacon itself throws, and falls back to fetch', async () => {
        sendBeaconMock.mockImplementation(() => { throw new Error('QuotaExceededError'); });
        expect(() => sendCollectBeacon('abc123', defaultOptions)).not.toThrow();
        await Promise.resolve();
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(DEFAULT_COLLECT_ENDPOINT);
        expect(init.mode).toBe('no-cors');
    });

    test('does not mark the session guard when nothing could be dispatched, so a later call retries', async () => {
        sendBeaconMock.mockImplementation(() => { throw new Error('QuotaExceededError'); });
        fetchMock.mockImplementation(() => { throw new Error('synchronous fetch failure'); });
        sendCollectBeacon('abc123', defaultOptions);
        await Promise.resolve();
        expect(sendBeaconMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Nothing was actually dispatched above (both transports threw
        // synchronously), so the session guard must still be open: a
        // subsequent call should try again rather than being silently
        // swallowed by the guard.
        sendBeaconMock.mockImplementation(() => true);
        sendCollectBeacon('def456', defaultOptions);
        expect(sendBeaconMock).toHaveBeenCalledTimes(2);
    });

    test('never throws or rejects when the fallback fetch rejects', async () => {
        delete (navigator as any).sendBeacon;
        fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
        expect(() => sendCollectBeacon('abc123', defaultOptions)).not.toThrow();
        await new Promise((r) => setTimeout(r, 0));
    });

    // Regression test: the fetch promise must have its rejection handled
    // directly, not via a race against a timer. A race settles as soon as
    // the timer fires, detaching its .catch() before a slower rejection
    // arrives -- which would surface as an unhandled rejection in the host
    // page's console (the exact thing this module promises never happens).
    test('does not produce an unhandled rejection when the fallback fetch rejects asynchronously after a delay', async () => {
        delete (navigator as any).sendBeacon;
        jest.useFakeTimers();

        let rejectFetch: (reason: unknown) => void;
        fetchMock.mockImplementation(() => new Promise((_, reject) => {
            rejectFetch = reject;
        }));

        const unhandledRejectionSpy = jest.fn();
        process.on('unhandledRejection', unhandledRejectionSpy);

        try {
            expect(() => sendCollectBeacon('abc123', defaultOptions)).not.toThrow();

            // Advance well past the old 2000ms timeout window before the
            // fetch promise ever rejects -- this is the scenario (DNS/
            // connection failure slower than the timeout) that previously
            // orphaned the rejection.
            jest.advanceTimersByTime(5000);
            rejectFetch!(new TypeError('Failed to fetch'));

            // Flush microtasks so the rejection has a chance to be reported
            // as unhandled if nothing is actually attached to it.
            jest.useRealTimers();
            await new Promise((r) => setTimeout(r, 0));
            await Promise.resolve();
            await Promise.resolve();

            expect(unhandledRejectionSpy).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', unhandledRejectionSpy);
        }
    });
});
