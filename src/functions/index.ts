/**
 * ThumbmarkJS: Main fingerprinting and API logic
 *
 * This module handles component collection, API calls, uniqueness scoring, and data filtering
 * for the ThumbmarkJS browser fingerprinting library.
 *
 */

import { defaultOptions, OptionsAfterDefaults, optionsInterface } from "../options";
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
import { stableStringify } from "../utils/stableStringify";


/**
 * Final thumbmark response structure
 */
export interface ThumbmarkError {
  type: 'component_timeout' | 'component_error' | 'api_timeout' | 'api_error' | 'api_unauthorized' | 'fatal';
  message: string;
  component?: string;
}

export interface ThumbmarkResponse {
  /** Hash of all components - the main fingerprint identifier */
  thumbmark: string;
  /** All resolved fingerprint components */
  components: componentInterface;
  /** Information from the API (IP, classification, uniqueness score) */
  info: infoInterface;
  /** Library version */
  version: string;
  /** Persistent visitor identifier (requires API key) */
  visitorId?: string;
  /** Performance timing for each component (only when options.performance is true) */
  elapsed?: Record<string, number>;
  /** Structured error array. Present only when errors occurred. */
  error?: ThumbmarkError[];
  /** Experimental components (only when options.experimental is true) */
  experimental?: componentInterface;
  /** Unique identifier for this API request */
  requestId?: string;
  /** Metadata echoed back from the API */
  metadata?: string | object;
}

/**
 * Main entry point: collects all components, optionally calls API, and returns thumbmark data.
 *
 * @param options - Options for fingerprinting and API
 * @returns ThumbmarkResponse (elapsed is present only if options.performance is true)
 */
export async function getThumbmark(options?: optionsInterface): Promise<ThumbmarkResponse> {
  // Early exit for non-browser environments (Node.js, Jest, SSR)
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      thumbmark: '',
      components: {},
      info: {},
      version: getVersion(),
      error: [{ type: 'fatal', message: 'Browser environment required' }]
    };
  }

  try {
    const _options = { ...defaultOptions, ...options } as OptionsAfterDefaults;
    const allErrors: ThumbmarkError[] = [];

    // Early logging decision
    const shouldLog = (_options.logging && !sessionStorage.getItem("_tmjs_l") && Math.random() < 0.0001);

    // Merge built-in and user-registered components
    const allComponents = { ...tm_component_promises, ...customComponents };
    const { elapsed, resolvedComponents: clientComponentsResult, errors: componentErrors } = await resolveClientComponents(allComponents, _options);
    allErrors.push(...componentErrors);

    // Resolve experimental components only when logging
    let experimentalComponents = {};
    let experimentalElapsed = {};
    if (shouldLog || _options.experimental) {
      const { elapsed: expElapsed, resolvedComponents, errors: expErrors } = await resolveClientComponents(tm_experimental_component_promises, _options);
      experimentalComponents = resolvedComponents;
      experimentalElapsed = expElapsed;
      allErrors.push(...expErrors);
    }

    const apiPromise = _options.api_key ? getApiPromise(_options, clientComponentsResult) : null;
    let apiResult = null;

    if (apiPromise) {
      try {
        apiResult = await apiPromise;
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_API_KEY') {
          return {
            error: [{ type: 'api_unauthorized', message: 'Invalid API key or quota exceeded' }],
            components: {},
            info: {},
            version: getVersion(),
            thumbmark: ''
          };
        }
        // Non-auth API errors (5xx, network): log error and continue without API data
        allErrors.push({
          type: 'api_error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Surface API timeout as a structured error
    if (apiResult?.info?.timed_out) {
      allErrors.push({ type: 'api_timeout', message: 'API request timed out' });
    }

    // Only add 'elapsed' if performance is true
    const allElapsed = { ...elapsed, ...experimentalElapsed };
    const maybeElapsed = _options.performance ? { elapsed: allElapsed } : {};
    const apiComponents = filterThumbmarkData(apiResult?.components || {}, _options);
    const components = { ...clientComponentsResult, ...apiComponents };
    const info: infoInterface = apiResult?.info || { uniqueness: { score: 'api only' } };

    // Use API thumbmark if available to ensure API/client sync, otherwise calculate locally
    const thumbmark = apiResult?.thumbmark ?? hash(stableStringify(components));
    const version = getVersion();

    // Only log to server when not in debug mode
    if (shouldLog) {
      logThumbmarkData(thumbmark, components, _options, experimentalComponents).catch(() => { /* do nothing */ });
    }

    const result: ThumbmarkResponse = {
      ...(apiResult?.visitorId && { visitorId: apiResult.visitorId }),
      thumbmark,
      components: components,
      info,
      version,
      ...maybeElapsed,
      ...(allErrors.length > 0 && { error: allErrors }),
      ...(Object.keys(experimentalComponents).length > 0 && _options.experimental && { experimental: experimentalComponents }),
      ...(apiResult?.requestId && { requestId: apiResult.requestId }),
      ...(apiResult?.metadata && { metadata: apiResult.metadata }),
    };

    return result;
  } catch (e) {
    return {
      thumbmark: '',
      components: {},
      info: {},
      version: getVersion(),
      error: [{ type: 'fatal', message: e instanceof Error ? e.message : String(e) }],
    };
  }
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
): Promise<{ elapsed: Record<string, number>, resolvedComponents: componentInterface, errors: ThumbmarkError[] }> {
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
  const errors: ThumbmarkError[] = [];

  resolvedValues.forEach((result, index) => {
    const key = keys[index];
    elapsed[key] = result.elapsed ?? 0;

    if (result.error === 'timeout') {
      errors.push({ type: 'component_timeout', message: `Component '${key}' timed out`, component: key });
    } else if (result.error) {
      errors.push({ type: 'component_error', message: result.error, component: key });
    }

    if (result.value != null) {
      resolvedComponentsRaw[key] = result.value;
    }
  });

  const resolvedComponents = filterThumbmarkData(resolvedComponentsRaw, opts);
  return { elapsed, resolvedComponents, errors };
}

export { globalIncludeComponent as includeComponent };