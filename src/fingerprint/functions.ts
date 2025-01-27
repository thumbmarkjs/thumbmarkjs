import {componentInterface, getComponentPromises, timeoutInstance} from '../factory'
import {hash} from '../utils/hash'
import {raceAll, raceAllPerformance} from '../utils/raceAll'
import {options} from './options'

export async function getFingerprintData(): Promise<componentInterface>  {
    try {
        const promiseMap: Record<string, Promise<componentInterface>> = getComponentPromises()
        const keys: string[] = Object.keys(promiseMap)
        const promises: Promise<componentInterface>[] = Object.values(promiseMap)
        const resolvedValues: (componentInterface | undefined)[] = await raceAll(promises, options?.timeout || 1000, timeoutInstance);
        const validValues: componentInterface[] = resolvedValues.filter((value): value is componentInterface => value !== undefined);
        const resolvedComponents: Record<string, componentInterface> = {};
        validValues.forEach((value, index) => {
            resolvedComponents[keys[index]] = value
        })
        return filterFingerprintData(resolvedComponents, options.exclude || [], options.include || [], "")
    }
    catch (error) {
        throw error
    }
}

/** 
 * This function filters the fingerprint data based on the exclude and include list
 * @param {componentInterface} obj - components objects from main componentInterface
 * @param {string[]} excludeList - elements to exclude from components objects (e.g : 'canvas', 'system.browser')
 * @param {string[]} includeList - elements to only include from components objects (e.g : 'canvas', 'system.browser')
 * @param {string} path - auto-increment path iterating on key objects from components objects
 * @returns {componentInterface} result - returns the final object before hashing in order to get fingerprint
 */
function filterFingerprintData(obj: componentInterface, excludeList: string[], includeList: string[], path: string = ""): componentInterface {
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

export async function getFingerprint(includeData?: false): Promise<string>
export async function getFingerprint(includeData: true): Promise<{ hash: string, data: componentInterface }>
export async function getFingerprint(includeData?: boolean): Promise<string | { hash: string, data: componentInterface }> {
    try {
        const fingerprintData = await getFingerprintData()
        const thisHash = hash(JSON.stringify(fingerprintData))
        if (includeData) {
            return { hash: thisHash.toString(), data: fingerprintData }
        } else {
            return thisHash.toString()
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
