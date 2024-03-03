import { getComponentPromises, timeoutInstance, componentInterface } from '../factory'
import { hash } from '../utils/hash'
import { raceAll, raceAllPerformance} from '../utils/raceAll'
import { options } from './options'

const _TIMEOUT: number = 1000

export async function getFingerprintData(): Promise<componentInterface>  {
    try {
        const promiseMap: Record<string, Promise<componentInterface>> = await getComponentPromises()
        const keys: string[] = Object.keys(promiseMap)
        const promises: Promise<componentInterface>[] = Object.values(promiseMap)
        const resolvedValues: (componentInterface | undefined)[] = await raceAll(promises, _TIMEOUT, timeoutInstance);
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

export async function getFingerprint(): Promise<string> {
    try {
        const fingerprintData = await getFingerprintData()
        const thisHash = hash(JSON.stringify(fingerprintData))
        return thisHash.toString()
    } catch (error) {
        throw error
    }
}

export async function getFingerprintPerformance() {
    try {
        const promiseMap = getComponentPromises()
        const keys = Object.keys(promiseMap)
        const promises = Object.values(promiseMap)
        const resolvedValues = await raceAllPerformance(promises, _TIMEOUT, timeoutInstance )
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
