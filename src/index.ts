import { getComponentPromises, timeoutInstance, componentInterface } from './factory';
import { hash } from './utils/hash';
import { raceAll } from './utils/raceAll';
import * as packageJson from '../package.json';
const componentsContext = require.context('./components', true, /\.ts$/);
componentsContext.keys().forEach(componentsContext);

interface fingerprintOptionsInterface {
    [key: string]: string | boolean | number;
}

export async function getFingerprintData(opts?: fingerprintOptionsInterface): Promise<componentInterface>  {
    try {
        const timeout = 1000;
        const promiseMap = getComponentPromises();
        const keys = Object.keys(promiseMap);
        const promises = Object.values(promiseMap);
        const resolvedValues = await raceAll(promises, timeout, timeoutInstance );
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

export async function getFingerprint(opts?: fingerprintOptionsInterface): Promise<string> {
    try {
        const fingerprintData = await getFingerprintData();
        const thisHash = hash(JSON.stringify(fingerprintData));
        return thisHash.toString();
    } catch (error) {
        throw error;
    }
}

export function getVersion(): string {
    return packageJson.version;
}