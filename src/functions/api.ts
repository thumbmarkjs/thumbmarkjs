import { optionsInterface, DEFAULT_API_ENDPOINT } from '../options';
import { componentInterface } from '../factory';
import { getVisitorId, setVisitorId } from '../utils/visitorId';
import { getVersion } from "../utils/version";
import { hash } from '../utils/hash';
import { stableStringify } from '../utils/stableStringify';

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
interface apiResponse {
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
    options: optionsInterface,
    components: componentInterface
): Promise<apiResponse | null> => {
    // 1. If a result is already cached and caching is enabled, return it.
    if (options.cache_api_call && apiPromiseResult) {
        return Promise.resolve(apiPromiseResult);
    }

    // 2. If a request is already in flight, return that promise to prevent duplicate calls.
    if (currentApiPromise) {
        return currentApiPromise;
    }

    // 3. Otherwise, initiate a new API call with timeout.
    const apiEndpoint = options.api_endpoint || DEFAULT_API_ENDPOINT;
    const endpoint = `${apiEndpoint}/thumbmark`;
    const visitorId = getVisitorId();
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
                setVisitorId(data.visitorId);
            }
            apiPromiseResult = data;      // Cache the successful result
            currentApiPromise = null;     // Clear the in-flight promise
            return data;
        })
        .catch(error => {
            currentApiPromise = null;     // Clear the in-flight promise on error

            // For 403 errors (invalid API key), propagate without logging (expected in tests)
            if (error.message === 'INVALID_API_KEY') {
                throw error;
            }

            // Log other unexpected errors
            console.error('Error fetching pro data', error);

            // Return null for other errors to prevent downstream crashes
            return null;
        });

    // Timeout logic
    const timeoutMs = options.timeout || 5000;
    const timeoutPromise = new Promise<apiResponse>((resolve) => {
        setTimeout(() => {
            resolve({
                info: { timed_out: true },
                version: getVersion(),
            });
        }, timeoutMs);
    });

    currentApiPromise = Promise.race([fetchPromise, timeoutPromise]);
    return currentApiPromise;
};
