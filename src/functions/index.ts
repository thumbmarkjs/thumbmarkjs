/**
 * ThumbmarkJS: Main fingerprinting and API logic
 *
 * This module handles component collection, API calls, uniqueness scoring, and data filtering
 * for the ThumbmarkJS browser fingerprinting library.
 *
 * Exports:
 *   - getThumbmark
 *   - getThumbmarkDataFromPromiseMap
 *   - resolveClientComponents
 *   - filterThumbmarkData
 *
 * Internal helpers and types are also defined here.
 */

// ===================== Imports =====================
import { defaultOptions, optionsInterface } from "../options";
import { 
    timeoutInstance,
    componentInterface,
    tm_component_promises,
    customComponents,
    includeComponent as globalIncludeComponent
} from "../factory";
import { hash } from "../utils/hash";
import { raceAllPerformance } from "../utils/raceAll";
import { getVersion } from "../utils/version";
import { filterThumbmarkData } from './filterComponents'
import { logThumbmarkData } from '../utils/log';
import { API_ENDPOINT } from "../options";

// ===================== Types & Interfaces =====================

/**
 * Info returned from the API (IP, classification, uniqueness, etc)
 */
interface infoInterface {
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
    thumbmark?: string;
    info?: infoInterface;
    version?: string;
    components?: componentInterface;
}

/**
 * Final thumbmark response structure
 */
interface thumbmarkResponse {
    components: componentInterface,
    info: { [key: string]: any },
    version: string,
    thumbmark: string,
    /**
     * Only present if options.performance is true.
     */
    elapsed?: any;
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
    const endpoint = `${API_ENDPOINT}/thumbmark`;
    const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
            'x-api-key': options.api_key!,
            'Authorization': 'custom-authorized',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ components, options, clientHash: hash(JSON.stringify(components)), version: getVersion()}),
    })
        .then(response => {
            // Handle HTTP errors that aren't network errors
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            apiPromiseResult = data;      // Cache the successful result
            currentApiPromise = null;     // Clear the in-flight promise
            return data;
        })
        .catch(error => {
            console.error('Error fetching pro data', error);
            currentApiPromise = null;     // Also clear the in-flight promise on error
            // Return null instead of a string to prevent downstream crashes
            return null;
        });

    // Timeout logic
    const timeoutMs = options.timeout || 5000;
    const timeoutPromise = new Promise<apiResponse>((resolve) => {
        setTimeout(() => {
            resolve({
                thumbmark: hash(JSON.stringify(components)),
                info: { timed_out: true },
                version: getVersion(),
            });
        }, timeoutMs);
    });

    currentApiPromise = Promise.race([fetchPromise, timeoutPromise]);
    return currentApiPromise;
};

// ===================== Main Thumbmark Logic =====================



/**
 * Main entry point: collects all components, optionally calls API, and returns thumbmark data.
 *
 * @param options - Options for fingerprinting and API
 * @returns thumbmarkResponse (elapsed is present only if options.performance is true)
 */
export async function getThumbmark(options?: optionsInterface): Promise<thumbmarkResponse> {
    const _options = { ...defaultOptions, ...options };
    // Merge built-in and user-registered components
    const allComponents = { ...tm_component_promises, ...customComponents };
    const { elapsed, resolvedComponents: clientComponentsResult } = await resolveClientComponents(allComponents, _options);

    const apiPromise = _options.api_key ? getApiPromise(_options, clientComponentsResult) : null;
    const apiResult = apiPromise ? await apiPromise : null;

    // Only add 'elapsed' if performance is true
    const maybeElapsed = _options.performance ? { elapsed } : {};
    const apiComponents = filterThumbmarkData(apiResult?.components || {}, _options);
    const components = {...clientComponentsResult, ...apiComponents};
    const info: infoInterface = apiResult?.info || { uniqueness: { score: 'api only' } };
    const thumbmark = hash(JSON.stringify(components));
    const version = getVersion();
    logThumbmarkData(thumbmark, components, _options).catch(() => { /* do nothing */ });
    return {
        thumbmark,
        components: components,
        info,
        version,
        ...maybeElapsed,
    };
}

// ===================== Component Resolution & Performance =====================

/**
 * Resolves and times all filtered component promises from a component function map.
 *
 * @param comps - Map of component functions
 * @param options - Options for filtering and timing
 * @returns Object with elapsed times and filtered resolved components
 */
export async function resolveClientComponents(
  comps: { [key: string]: (options?: optionsInterface) => Promise<componentInterface | null> },
  options?: optionsInterface
): Promise<{ elapsed: Record<string, number>, resolvedComponents: componentInterface }> {
  const opts = { ...defaultOptions, ...options };
  const filtered = Object.entries(comps)
    .filter(([key]) => !opts?.exclude?.includes(key))
    .filter(([key]) =>
      opts?.include?.some(e => e.includes('.'))
        ? opts?.include?.some(e => e.startsWith(key))
        : opts?.include?.length === 0 || opts?.include?.includes(key)
    );
  const keys = filtered.map(([key]) => key);
  const promises = filtered.map(([_, fn]) => fn(options));
  const resolvedValues = await raceAllPerformance(promises, opts?.timeout || 5000, timeoutInstance);

  const elapsed: Record<string, number> = {};
  const resolvedComponentsRaw: Record<string, componentInterface> = {};

  resolvedValues.forEach((value, index) => {
    if (value.value != null) {
      resolvedComponentsRaw[keys[index]] = value.value;
      elapsed[keys[index]] = value.elapsed ?? 0;
    }
  });

  const resolvedComponents = filterThumbmarkData(resolvedComponentsRaw, opts);
  return { elapsed, resolvedComponents };
}



export { globalIncludeComponent as includeComponent };