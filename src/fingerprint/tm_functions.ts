import {  } from "./functions";
import { defaultOptions, optionsInterface } from "./options";
import tm_components from "../components/tm_components";
//import { getComponentPromises } from "../factory";
import { componentInterface } from "../factory";
import { hash } from "../utils/hash";
import { raceAll } from "../utils/raceAll";
import { timeoutInstance } from "../factory";
import * as packageJson from '../../package.json'

export function getVersion(): string {
    return packageJson.version
}

export const getComponentPromises = (
    comps: { [key: string]: (options?: optionsInterface) => Promise<componentInterface | null> },
    options?: optionsInterface) => {
    const opts = { ...defaultOptions, ...options };
    const c = comps;
    return Object.fromEntries(
        Object.entries(c)
            .filter(([key]) => {
                return !opts?.exclude?.includes(key)}
                )
            .filter(([key]) => {
                return opts?.include?.some(e => e.includes('.'))
                    ? opts?.include?.some(e => e.startsWith(key))
                    : opts?.include?.length === 0 || opts?.include?.includes(key)
            }
                    )
            .map(([key, value]) => [key, value()])
    );
};

let currentProPromise: Promise<componentInterface> | null = null;
let proPromiseResult: componentInterface;

export const getApiPromise = (options: optionsInterface): Promise<componentInterface> => {
    console.log("cache", options.cache_api_call);
    // By default, API calls are cached to prevent unnecessary calls.
    if (options.cache_api_call && currentProPromise) {
        console.log("chaining");
        return Promise.resolve(proPromiseResult);
    }
    // API call promises are chained as well, so that simultaneous calls are not made.
    else if (currentProPromise) {
        console.log("cached");
        return currentProPromise;
    }
    const endpoint = 'https://d903eo6428tug.cloudfront.net/thumbmark';
    console.log('api call');

    currentProPromise = fetch(endpoint, {
        method: 'GET',
        headers: {
            'x-api-key': options.api_key!,
            'Authorization': 'custom-authorized',
        }
    })
    .then(response => response.json())
    .then(data => {
        proPromiseResult = data;
        currentProPromise = null;
        return data
    })
    .catch(error => {
        console.error('Error fetching pro data', error);
        return 'error';
    })

    return currentProPromise;
}

export async function getThumbmark(options?: optionsInterface): Promise<any> {
    const _options = {...defaultOptions, ...options };
    console.log(_options);

    const promiseMap = 
    (_options.api_key) ?
        { ...getComponentPromises(tm_components, _options), ...{api: getApiPromise(_options)} }
    :
        getComponentPromises(tm_components, _options);

    const components = await getThumbmarkDataFromPromiseMap(promiseMap, _options);
    console.log("components", components, _options?.api_key !== undefined);
    const thumbmark = hash(JSON.stringify(components))

    return {
        thumbmark: thumbmark,
        components,
        version: getVersion(),
        info: {
            'uniqueness_score': 95,
            'bot_score': 1,
        }
    }
}

export async function getThumbmarkDataFromPromiseMap(
    promiseMap: Record<string, Promise<componentInterface | null>>,
    options?: optionsInterface)
: Promise<componentInterface>  {
    try {
        const keys: string[] = Object.keys(promiseMap)
        const promises: Promise<componentInterface | null>[] = Object.values(promiseMap)
        const resolvedValues: (componentInterface | null | undefined)[] = await raceAll(promises, options?.timeout || 1000, timeoutInstance);
        const validValues: componentInterface[] = resolvedValues.filter((value): value is componentInterface => value !== undefined);
        const resolvedComponents: Record<string, componentInterface> = {};
        validValues.forEach((value, index) => {
            resolvedComponents[keys[index]] = value
        })
        return filterThumbmarkData(resolvedComponents, options, "")
    }
    catch (error) {
        throw error
    }
}

export function filterThumbmarkData(obj: componentInterface, options?: optionsInterface, path: string = ""): componentInterface {
    const result: componentInterface = {};
    const excludeList = options?.exclude || [];
    const includeList = options?.include || [];

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path + key + ".";

        if (typeof value === "object" && !Array.isArray(value)) {
            const filtered = filterThumbmarkData(value, options, currentPath);
            if (Object.keys(filtered).length > 0) {
                result[key] = filtered;
            }
        } else {
            const isExcluded = excludeList.some(exclusion => currentPath.startsWith(exclusion));
            const isIncluded = includeList.some(inclusion => currentPath.startsWith(inclusion));

            if (!isExcluded || isIncluded) {
                result[key] = value;
            }
        }
    }

    return result;
}