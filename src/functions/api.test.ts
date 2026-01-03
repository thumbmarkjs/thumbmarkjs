import {apiResponse, getCachedApiResponse, setCachedApiResponse, getApiPromise} from "./api";
import { defaultOptions } from "../options";
import {getCache, setCache} from "../utils/cache";
import type { componentInterface } from "../factory";
import * as hashModule from "../utils/hash";
import * as stringifyModule from "../utils/stableStringify";

const options = {
    ...defaultOptions,
    cache_lifetime_in_ms: 100,
}

const apiResponse = {
    identifier: 'test'
} as apiResponse;

describe('setCachedApiResponse', () => {
    beforeEach(() => {
        localStorage.clear();
    })

    test('it should write the apiResponse to the cache if options allow that', () => {
        setCachedApiResponse(options, apiResponse);
        expect(getCache(options).apiResponse).toEqual(apiResponse);
    });

    test('it should not write if cache if off', () => {
        setCachedApiResponse({
            ...options,
            cache_api_call: false,
        }, apiResponse);

        expect(getCache(options).apiResponse).not.toBeDefined();
        expect(getCache(options).apiResponseExpiry).not.toBeDefined();
    });

    test('it should not write if lifetime is 0', () => {
        setCachedApiResponse({
            ...options,
            cache_lifetime_in_ms: 0
        }, apiResponse);

        expect(getCache(options).apiResponse).not.toBeDefined();
        expect(getCache(options).apiResponseExpiry).not.toBeDefined();
    });
})

describe('getCachedApiResponse', () => {
    beforeEach(() => {
        localStorage.clear();
    })

    test('it should get from the cache if a value exists there', () => {
        setCache(options, {
            apiResponseExpiry: Date.now() + 2000000,
            apiResponse,
        });

        const cached = getCachedApiResponse(options);
        expect(cached).toBeDefined();
        expect(cached).toEqual(apiResponse);
    });

    test('it should not return an expiried cache', () => {
        setCache(options, {
            apiResponseExpiry: Date.now() - 2000,
            apiResponse,
        });

        const cached = getCachedApiResponse(options);
        expect(cached).not.toBeDefined();
    })

})

describe('getApiPromise timeout behavior', () => {
    let mockFetch: jest.Mock;
    const testOptions = {
        ...defaultOptions,
        api_key: 'test-api-key',
        timeout: 100, // Short timeout for tests
        cache_lifetime_in_ms: 1000,
    };

    const testComponents: componentInterface = {
        userAgent: 'test-agent',
        screen: { width: 1920, height: 1080 },
    };

    beforeAll(() => {
        // Polyfill TextEncoder for jsdom environment
        if (typeof TextEncoder === 'undefined') {
            const util = require('util');
            global.TextEncoder = util.TextEncoder;
            global.TextDecoder = util.TextDecoder;
        }

        // Mock hash and stableStringify to avoid TextEncoder issues
        jest.spyOn(hashModule, 'hash').mockReturnValue('mocked-hash');
        jest.spyOn(stringifyModule, 'stableStringify').mockReturnValue('{"mocked":"data"}');

        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(async () => {
        // Clear all pending timers and promises from previous tests
        jest.clearAllTimers();

        localStorage.clear();
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Re-mock hash and stableStringify for each test
        jest.spyOn(hashModule, 'hash').mockReturnValue('mocked-hash');
        jest.spyOn(stringifyModule, 'stableStringify').mockReturnValue('{"mocked":"data"}');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('returns fetch response when fetch completes before timeout', async () => {
        // Use options without caching to avoid state interference
        const noCacheOptions = {
            ...testOptions,
            cache_lifetime_in_ms: 0, // Disable caching
        };

        // Mock fetch to resolve quickly
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                version: '1.2.3',
                visitorId: 'test-visitor-id',
                thumbmark: 'test-thumbmark',
                info: {
                    ip_address: {
                        ip_address: '1.2.3.4',
                        ip_identifier: 'abc123',
                        autonomous_system_number: 12345,
                        ip_version: 'v4' as const,
                    }
                }
            })
        });

        const promise = getApiPromise(noCacheOptions, testComponents);

        // Fast forward time, but fetch completes before timeout
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBeDefined();
        expect(result?.version).toBe('1.2.3');
        expect(result?.info?.timed_out).toBeUndefined();
        expect(result?.thumbmark).toBe('test-thumbmark');
    });

    test('returns expired cache when timeout occurs and cache exists', async () => {
        // Disable caching to test timeout fallback without request deduplication
        const noCacheOptions = {
            ...testOptions,
            cache_api_call: false,
        };

        // Set up expired cache
        const expiredCachedValue = {
            apiResponseExpiry: Date.now() - 100, // Expired
            apiResponse: {
                version: '1.2.3',
                thumbmark: 'cached-thumbmark',
                info: {
                    ip_address: {
                        ip_address: '1.2.3.4',
                        ip_identifier: 'abc123',
                        autonomous_system_number: 12345,
                        ip_version: 'v4' as const,
                    }
                }
            }
        };
        setCache(noCacheOptions, expiredCachedValue);

        // Mock fetch to never resolve (hanging request)
        mockFetch.mockReturnValueOnce(new Promise(() => {}));

        const promise = getApiPromise(noCacheOptions, testComponents);

        // Advance timers to trigger timeout
        await jest.runAllTimersAsync();
        const result = await promise;

        // Should return expired cache, not timeout response
        expect(result).toBeDefined();
        expect(result?.version).toBe('1.2.3');
        expect(result?.thumbmark).toBe('cached-thumbmark');
        expect(result?.info?.timed_out).toBeUndefined();
    });

    test('returns timeout response when timeout occurs and no cache exists', async () => {
        const noCacheOptions = {
            ...testOptions,
            cache_api_call: false,
        };

        expect(getCache(noCacheOptions)).toEqual({});

        mockFetch.mockReturnValueOnce(new Promise(() => {}));

        const promise = getApiPromise(noCacheOptions, testComponents);

        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBeDefined();
        expect(result?.info?.timed_out).toBe(true);

        const cached = getCache(noCacheOptions);
        expect(cached.apiResponse).toBeUndefined();
    });
})