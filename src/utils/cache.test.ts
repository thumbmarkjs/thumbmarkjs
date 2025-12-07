import { Cache, getCache, setCache, getApiResponseExpiry, CACHE_KEY } from "./cache";
import { DEFAULT_STORAGE_PREFIX, defaultOptions, MAXIMUM_CACHE_LIFETIME } from "../options";

const _options = {
    property_name_factory: (name: string) => {
        return `${name}-mypostfix`;
    },
    cache_lifetime_in_ms: 0,
};

const values: Cache = {
    apiResponseExpiry: 100,
    apiResponse: {
        version: '1.2.3',
    },
};

const cacheProperty = defaultOptions.property_name_factory(CACHE_KEY);
const customCacheProperty = _options.property_name_factory(CACHE_KEY);

describe('getCache', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('it should return all values from cache', () => {
        localStorage.setItem(cacheProperty, JSON.stringify(values));
        const fromStorage = getCache(defaultOptions);

        expect(fromStorage).toEqual(values);
    });

    test('it should return an empty object in case of nothing cached', () => {
        expect(getCache(defaultOptions)).toEqual({});
    });

    test('it should return an empty object in case non-json content', () => {
        localStorage.setItem(cacheProperty, 'abc123');
        expect(getCache(defaultOptions)).toEqual({});
    });

    test('it should return from the correct property', () => {
        localStorage.setItem(cacheProperty, JSON.stringify(values));

        expect(getCache(_options)).toEqual({});
        expect(getCache(defaultOptions)).toEqual(values);
    });
})

describe('setCache', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('it should write given values', () => {
        setCache(defaultOptions, values);
        expect(JSON.parse(localStorage.getItem(cacheProperty)!))
            .toEqual(values);
    });

    test('it should not touch values that are not provided', () => {
        setCache(_options, values);
        setCache(_options, {
            apiResponseExpiry: 200
        });
        const fromStorage = JSON.parse(localStorage.getItem(customCacheProperty)!) as Cache;
        expect(fromStorage.apiResponseExpiry).toEqual(200);
        expect(fromStorage.apiResponse!.version).toEqual(values.apiResponse!.version);
    })
})

describe('getApiResponseExpiry', () => {
    const systemTime = 1000;
    beforeAll(() => {
        jest.useFakeTimers().setSystemTime(systemTime);
        localStorage.clear();
    });

    test('it should return a value based on options', () => {
        expect(getApiResponseExpiry({
            cache_lifetime_in_ms: 100,
        })).toBe(systemTime + 100);
    });

    test('it should not go over maximum cache lifetime', () => {
        expect(getApiResponseExpiry({
            cache_lifetime_in_ms: MAXIMUM_CACHE_LIFETIME + 200,
        })).toBe(systemTime + MAXIMUM_CACHE_LIFETIME);
    })

    afterAll(() => {
        jest.useRealTimers()
    })
})