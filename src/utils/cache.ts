import { apiResponse } from "../functions/api";
import { MAXIMUM_CACHE_LIFETIME, OptionsAfterDefaults } from "../options";

export const CACHE_KEY = 'cache';

export interface Cache {
    apiResponse?: apiResponse
    apiResponseExpiry?: number;
}

/**
 * Get all values from cache
 * @param _options
 */
export function getCache(_options: Pick<OptionsAfterDefaults, 'property_name_factory'>): Cache {
    try {
        const rawCache = localStorage.getItem(_options.property_name_factory(CACHE_KEY));
        const jsonCache = JSON.parse(rawCache!);
        if(!jsonCache) {
            return {};
        } else {
            return jsonCache as Cache;
        }
    } catch {
        // Ignore storage errors
    }

    return {};
}

/**
 * Write given values to cache
 * @param _options
 * @param values
 */
export function setCache(_options: OptionsAfterDefaults, values: Partial<Cache>): void {
    const newValues: Cache = {
        ...getCache(_options),
        ...values
    };

    try {
        localStorage.setItem(_options.property_name_factory(CACHE_KEY), JSON.stringify(newValues));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Returns the expiry time for cache
 * @param _options
 */
export function getApiResponseExpiry(_options: Pick<OptionsAfterDefaults, 'cache_lifetime_in_ms'>): number {
    if(_options.cache_lifetime_in_ms > MAXIMUM_CACHE_LIFETIME) {
        return Date.now() + MAXIMUM_CACHE_LIFETIME;
    }

    return Date.now() + _options.cache_lifetime_in_ms;
}