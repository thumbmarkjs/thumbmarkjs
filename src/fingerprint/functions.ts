import { getComponentPromises, timeoutInstance, componentInterface } from '../factory';
import { hash } from '../utils/hash';
import { raceAll, raceAllPerformance} from '../utils/raceAll';

const _TIMEOUT: number = 1000

export async function getFingerprintData(): Promise<componentInterface>  {
    try {
        const promiseMap = getComponentPromises();
        const keys = Object.keys(promiseMap);
        const promises = Object.values(promiseMap);
        const resolvedValues = await raceAll(promises, _TIMEOUT, timeoutInstance );
        const resolvedComponents: { [key: string]: any } = {};
        resolvedValues.forEach((value, index) => {
            resolvedComponents[keys[index]] = value;
        });
        return resolvedComponents;
    }
    catch (error) {
        throw error;
    }
}

export async function getFingerprint(): Promise<string> {
    try {
        const fingerprintData = await getFingerprintData();
        const thisHash = hash(JSON.stringify(fingerprintData));
        return thisHash.toString();
    } catch (error) {
        throw error;
    }
}

export async function getFingerprintPerformance() {
    try {
        const promiseMap = getComponentPromises();
        const keys = Object.keys(promiseMap);
        const promises = Object.values(promiseMap);
        const resolvedValues = await raceAllPerformance(promises, _TIMEOUT, timeoutInstance );
        const resolvedComponents: { [key: string]: any } = {}
        resolvedValues.forEach((value, index) => {
            resolvedComponents[keys[index]] = value.elapsed;
            //resolvedComponents["elapsed"][keys[index]] = value.elapsed;
        });
        return resolvedComponents;
    }
    catch (error) {
        throw error;
    }
}
