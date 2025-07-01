import {componentInterface, getComponentPromises, timeoutInstance} from '../factory'
import {options} from './options'
import { raceAllPerformance } from '../utils/raceAll';
import { getVersion } from './tm_functions';

import { getThumbmark } from './tm_functions'

export async function getFingerprintData() {
    const thumbmarkData = await getThumbmark(options);
    return thumbmarkData.components;
}

/** 
 * This function filters the fingerprint data based on the exclude and include list
 * @param {componentInterface} obj - components objects from main componentInterface
 * @param {string[]} excludeList - elements to exclude from components objects (e.g : 'canvas', 'system.browser')
 * @param {string[]} includeList - elements to only include from components objects (e.g : 'canvas', 'system.browser')
 * @param {string} path - auto-increment path iterating on key objects from components objects
 * @returns {componentInterface} result - returns the final object before hashing in order to get fingerprint
 */
export function filterFingerprintData(obj: componentInterface, excludeList: string[], includeList: string[], path: string = ""): componentInterface {
    const result: componentInterface = {};

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path + key + ".";

        if (typeof value === "object" && !Array.isArray(value)) {
            const filtered = filterFingerprintData(value, excludeList, includeList, currentPath);
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
/**
 * 
 * @param includeData - if true, the function will return an object with the hash and the data
 * @returns Promise<string | { hash: string, data: componentInterface }>
 * @deprecated This function will be removed. Use getThumbmark() instead.
 */
export async function getFingerprint(includeData?: false): Promise<string>
export async function getFingerprint(includeData: true): Promise<{ hash: string, data: componentInterface }>
export async function getFingerprint(includeData?: boolean): Promise<string | { hash: string, data: componentInterface }> {
    try {
        const thumbmarkData = await getThumbmark(options);
        if (Math.random() < 0.00001 && options.logging) logFingerprintData(thumbmarkData.thumbmark, thumbmarkData.components)
        if (includeData) {
            return { hash: thumbmarkData.thumbmark.toString(), data: thumbmarkData.components}
        } else {
            return thumbmarkData.thumbmark.toString()
        }
    } catch (error) {
        throw error
    }
}

export async function getFingerprintPerformance() {
    try {
        const promiseMap = getComponentPromises()
        const keys = Object.keys(promiseMap)
        const promises = Object.values(promiseMap)
        const resolvedValues = await raceAllPerformance(promises, options?.timeout || 1000, timeoutInstance )
        const resolvedComponents: { [key: string]: any } = {
            elapsed: {}
        }
        resolvedValues.forEach((value, index) => {
            resolvedComponents[keys[index]] = value.value
            resolvedComponents["elapsed"][keys[index]] = value.elapsed
        });
        return resolvedComponents
    }
    catch (error) {
        throw error
    }
}

// Function to log the fingerprint data
async function logFingerprintData(thisHash: string, fingerprintData: componentInterface) {
    const url = 'https://logging.thumbmarkjs.com/v1/log'
    const payload = {
        thumbmark: thisHash,
        components: fingerprintData,
        version: getVersion()
    };
    if (!sessionStorage.getItem("_tmjs_l")) {
        sessionStorage.setItem("_tmjs_l", "1")
        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch { } // do nothing
    }
}