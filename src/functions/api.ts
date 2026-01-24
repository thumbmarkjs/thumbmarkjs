import { optionsInterface, DEFAULT_API_ENDPOINT, OptionsAfterDefaults} from '../options';
import { componentInterface } from '../factory';
import { getVisitorId, setVisitorId } from '../utils/visitorId';
import { getVersion } from "../utils/version";
import { hash } from '../utils/hash';
import { stableStringify } from '../utils/stableStringify';
import { getCache, getApiResponseExpiry, setCache } from "../utils/cache";

// ===================== Types & Interfaces =====================

/**
 * Info returned from the API (IP, classification, uniqueness, etc)
 */
export interface infoInterface {
    ip_address?: {
        ip_address: string,
        ip_identifier: string,
        autonomous_system_number: number,
        ip_version: 'v6' | 'v4',
    },
    classification?: {
        tor: boolean,
        vpn: boolean,
        bot: boolean,
        datacenter: boolean,
        danger_level: number, // 5 is highest and should be blocked. 0 is no danger.
    },
    uniqueness?: {
        score: number | string
    },
    timed_out?: boolean; // added for timeout handling
}

/**
 * API response structure
 */
export interface apiResponse {
    info?: infoInterface;
    version?: string;
    components?: componentInterface;
    visitorId?: string;
    thumbmark?: string;
}

// ===================== API Call Logic =====================

let currentApiPromise: Promise<apiResponse> | null = null;
let apiPromiseResult: apiResponse | null = null;

/**
 * Calls the Thumbmark API with the given components, using caching and deduplication.
 * Returns a promise for the API response or null on error.
 */
export const getApiPromise = (
    options: OptionsAfterDefaults,
    components: componentInterface
): Promise<apiResponse | null> => {
    // 1. If a result is already cached and caching is enabled, return it.
    if (options.cache_api_call) {
        // Check the in-memory cache
        if(apiPromiseResult) {
            return Promise.resolve(apiPromiseResult);
        }

        // Check the localStorage cache
        const cached = getCachedApiResponse(options);
        if(cached) {
            return Promise.resolve(cached);
        }

        // 2. If a request is already in flight, return that promise to prevent duplicate calls.
        // Moved inside the cache_api_call check to avoid holding onto promises when caching is disabled.
        if (currentApiPromise) {
            return currentApiPromise;
        }
    }

    // 3. Otherwise, initiate a new API call with timeout.
    const apiEndpoint = options.api_endpoint || DEFAULT_API_ENDPOINT;
    const endpoint = `${apiEndpoint}/thumbmark`;
    const visitorId = getVisitorId(options);
    const requestBody: any = {
        components,
        options,
        clientHash: hash(stableStringify(components)),
        version: getVersion()
    };
    if (visitorId) {
        requestBody.visitorId = visitorId;
    }

    const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
            'x-api-key': options.api_key!,
            'Authorization': 'custom-authorized',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })
        .then(response => {
            // Handle HTTP errors that aren't network errors
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('INVALID_API_KEY');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Handle visitor ID from server response
            if (data.visitorId && data.visitorId !== visitorId) {
                setVisitorId(data.visitorId, options);
            }
            apiPromiseResult = data;      // Cache the successful result
            setCachedApiResponse(options, data); // Cache to localStorage according to options
            currentApiPromise = null;     // Clear the in-flight promise
            return data;
        })
        .catch(error => {
            console.error('Error fetching pro data', error);
            currentApiPromise = null;     // Also clear the in-flight promise on error
            // For 403 errors, propagate the error instead of returning null
            if (error.message === 'INVALID_API_KEY') {
                throw error;
            }
            // Return null instead of a string to prevent downstream crashes
            return null;
        });

    // Timeout logic
    const timeoutMs = options.timeout || 5000;
    const timeoutPromise = new Promise<apiResponse>((resolve) => {
        setTimeout(() => {
            // On timeout, try to return expired cache as fallback
            // Note: getCache() returns cache regardless of expiry
            const cache = getCache(options);
            if (cache && cache.apiResponse) {
                resolve(cache.apiResponse);
            } else {
                resolve({
                    info: { timed_out: true },
                });
            }
        }, timeoutMs);
    });

    currentApiPromise = Promise.race([fetchPromise, timeoutPromise]);
    return currentApiPromise;
};

/**
 * If a valid cached api response exists, returns it
 * @param options
 */
export function getCachedApiResponse(
    options: Pick<OptionsAfterDefaults, 'property_name_factory'>,
): apiResponse | undefined {
    const cache = getCache(options);
    if (cache && cache.apiResponse && cache.apiResponseExpiry && Date.now() <= cache.apiResponseExpiry) {
        return cache.apiResponse;
    }

    return;
}

/**
 * Writes the api response to the cache according to the options
 * @param options
 * @param response
 */
export function setCachedApiResponse(
    options: Pick<OptionsAfterDefaults, 'cache_api_call' | 'cache_lifetime_in_ms' | 'property_name_factory'>, response: apiResponse
): void {
    if(!options.cache_api_call || !options.cache_lifetime_in_ms) {
        return;
    }

    setCache(options, {
        apiResponseExpiry: getApiResponseExpiry(options),
        apiResponse: response,
    });
}