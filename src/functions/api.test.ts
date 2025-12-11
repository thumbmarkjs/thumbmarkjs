import {apiResponse, getCachedApiResponse, setCachedApiResponse} from "./api";
import { defaultOptions } from "../options";
import {getCache, setCache} from "../utils/cache";

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