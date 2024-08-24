import { getComponentPromises, timeoutInstance, componentInterface } from '../factory'
import { hash } from '../utils/hash'
import { raceAll, raceAllPerformance} from '../utils/raceAll'
import { options } from './options'

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
        return filterFingerprintData(resolvedComponents, options.exclude || [])
    }
    catch (error) {
        throw error
    }
}

/** 
 * This function filters the fingerprint data based on the exclude list
 */
function filterFingerprintData(obj: componentInterface, excludeList: string[]): componentInterface {
    const result: componentInterface = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'object' && !Array.isArray(value)) {
                const filtered = filterFingerprintData(value, excludeList.map(e => e.startsWith(key + '.') ? e.slice(key.length + 1) : e));
                if (Object.keys(filtered).length > 0) {
                    result[key] = filtered;
                }
            } else if (!excludeList.includes(key)) {
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
