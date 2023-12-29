import { getComponentPromises, timeoutInstance, componentInterface } from './factory';
import { hash } from './utils/hash';
import { raceAll } from './utils/raceAll';
import * as packageJson from '../package.json';

export async function getFingerprintData(timeout: number = 1000): Promise<componentInterface>  {
    //
    const componentsContext = require.context('./components', true, /\.ts$/);
    componentsContext.keys().forEach(componentsContext);
    const promiseMap = getComponentPromises();
    const keys = Object.keys(promiseMap);
    const promises = Object.values(promiseMap);
    const resolvedValues = await raceAll(promises, timeout, timeoutInstance );
    const resolvedComponents: { [key: string]: any } = {};
    resolvedValues.forEach((value, index) => {
        resolvedComponents[keys[index]] = value;
    });
    return new Promise((resolve) => {
        resolve(resolvedComponents);
    })
}

export async function getFingerprint(): Promise<string> {    
    return new Promise((resolve) => {
        getFingerprintData().then( (data) => {
            const thisHash = hash(JSON.stringify(data));
            resolve(thisHash.toString());
        });
    });
}

export function getVersion(): string {
    return packageJson.version;
}