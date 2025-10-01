/**
 * ThumbmarkJS: Main fingerprinting and API logic
 *
 * This module handles component collection, API calls, uniqueness scoring, and data filtering
 * for the ThumbmarkJS browser fingerprinting library.
 *
 */

import { defaultOptions, optionsInterface } from "../options";
import { 
    timeoutInstance,
    componentInterface,
    tm_component_promises,
    customComponents,
    tm_experimental_component_promises,
    includeComponent as globalIncludeComponent
} from "../factory";
import { hash } from "../utils/hash";
import { raceAllPerformance } from "../utils/raceAll";
import { getVersion } from "../utils/version";
import { filterThumbmarkData } from './filterComponents'
import { logThumbmarkData } from '../utils/log';
import { getApiPromise, infoInterface } from "./api";


/**
 * Final thumbmark response structure
 */
interface thumbmarkResponse {
    components: componentInterface,
    info: { [key: string]: any },
    version: string,
    thumbmark: string,
    visitorId?: string,
    elapsed?: any;
    error?: string;
    experimental?: componentInterface;
}

/**
 * Main entry point: collects all components, optionally calls API, and returns thumbmark data.
 *
 * @param options - Options for fingerprinting and API
 * @returns thumbmarkResponse (elapsed is present only if options.performance is true)
 */
export async function getThumbmark(options?: optionsInterface): Promise<thumbmarkResponse> {
    const _options = { ...defaultOptions, ...options };
       
    // Early logging decision
    const shouldLog = (_options.logging && !sessionStorage.getItem("_tmjs_l") && Math.random() < 0.0001);
    
    // Merge built-in and user-registered components
    const allComponents = { ...tm_component_promises, ...customComponents };
    const { elapsed, resolvedComponents: clientComponentsResult } = await resolveClientComponents(allComponents, _options);

    // Resolve experimental components only when logging
    let experimentalComponents = {};
    if (shouldLog || _options.experimental) {
        const { resolvedComponents } = await resolveClientComponents(tm_experimental_component_promises, _options);
        experimentalComponents = resolvedComponents;
    }

    const apiPromise = _options.api_key ? getApiPromise(_options, clientComponentsResult) : null;
    let apiResult = null;
    
    if (apiPromise) {
        try {
            apiResult = await apiPromise;
        } catch (error) {
            // Handle API key/quota errors
            if (error instanceof Error && error.message === 'INVALID_API_KEY') {
                return {
                    error: 'Invalid API key or quota exceeded',
                    components: {},
                    info: {},
                    version: getVersion(),
                    thumbmark: ''
                };
            }
            throw error; // Re-throw other errors
        }
    }

    // Only add 'elapsed' if performance is true
    const maybeElapsed = _options.performance ? { elapsed } : {};
    const apiComponents = filterThumbmarkData(apiResult?.components || {}, _options);
    const components = {...clientComponentsResult, ...apiComponents};
    const info: infoInterface = apiResult?.info || { uniqueness: { score: 'api only' } };
    const thumbmark = hash(JSON.stringify(components));
    const version = getVersion();
    // Only log to server when not in debug mode
    if (shouldLog) {
        logThumbmarkData(thumbmark, components, _options, experimentalComponents).catch(() => { /* do nothing */ });
    }
    
    const result: thumbmarkResponse = {
        ...(apiResult?.visitorId && { visitorId: apiResult.visitorId }),
        thumbmark,
        components: components,
        info,
        version,
        ...maybeElapsed,
        ...(Object.keys(experimentalComponents).length > 0 && _options.experimental && { experimental: experimentalComponents }),
    };
    
    return result;
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