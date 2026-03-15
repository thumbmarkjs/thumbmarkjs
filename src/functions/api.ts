import { optionsInterface, DEFAULT_API_ENDPOINT, OptionsAfterDefaults } from '../options';
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
    requestId?: string;
    metadata?: string | object;
}

// ===================== API Call Logic =====================

export class ApiError extends Error {
    constructor(public status: number) {
        super(`HTTP error! status: ${status}`);
    }
}

let currentApiPromise: Promise<apiResponse> | null = null;
let apiPromiseResult: apiResponse | null = null;

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 200;

/**
 * Calls the API endpoint once. Returns the response data on success.
 * Throws ApiError on HTTP errors, or a native error on network failures.
 */
async function callApi(
    endpoint: string, body: any, options: OptionsAfterDefaults, visitorId: string | null,
): Promise<apiResponse> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'x-api-key': options.api_key!,
            'Authorization': 'custom-authorized',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new ApiError(response.status);

    const data = await response.json();
    if (data.visitorId && data.visitorId !== visitorId) setVisitorId(data.visitorId, options);
    apiPromiseResult = data;
    setCachedApiResponse(options, data);
    return data;
}

/**
 * Calls callApi with retries on network errors.
 * HTTP errors (ApiError) are not retried — only network failures.
 */
async function callApiWithRetry(
    endpoint: string, body: any, options: OptionsAfterDefaults, visitorId: string | null,
): Promise<apiResponse> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * RETRY_BACKOFF_MS));
        try {
            return await callApi(endpoint, body, options, visitorId);
        } catch (error) {
            if (error instanceof ApiError || attempt === MAX_RETRIES - 1) throw error;
        }
    }
    throw new Error('Unreachable');
}

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
        if (apiPromiseResult) {
            return Promise.resolve(apiPromiseResult);
        }

        // Check the localStorage cache
        const cached = getCachedApiResponse(options);
        if (cached) {
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
    // Resolve metadata if it's a function, otherwise use as-is
    if (options.metadata) {
        const resolvedMetadata = typeof options.metadata === 'function'
            ? options.metadata()
            : options.metadata;

        if (resolvedMetadata) {
            const metadataLength = typeof resolvedMetadata === 'string'
                ? resolvedMetadata.length
                : JSON.stringify(resolvedMetadata).length;

            if (metadataLength > 1000) {
                console.error('ThumbmarkJS: Metadata exceeds 1000 characters. Skipping metadata.');
            } else {
                requestBody.metadata = resolvedMetadata;
            }
        }
    }

    const timeoutMs = options.timeout || 5000;

    const apiCall = callApiWithRetry(endpoint, requestBody, options, visitorId)
        .finally(() => { currentApiPromise = null; });

    const timeout = new Promise<apiResponse>((resolve) => {
        setTimeout(() => {
            const cache = getCache(options);
            resolve(cache?.apiResponse || { info: { timed_out: true }, ...(visitorId && { visitorId }) });
        }, timeoutMs);
    });

    currentApiPromise = Promise.race([apiCall, timeout]);
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
    if (!options.cache_api_call || !options.cache_lifetime_in_ms) {
        return;
    }

    setCache(options, {
        apiResponseExpiry: getApiResponseExpiry(options),
        apiResponse: response,
    });
}