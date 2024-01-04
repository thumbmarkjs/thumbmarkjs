import { getComponentPromises, timeoutInstance, componentInterface } from './factory';
import { hash } from './utils/hash';
import { raceAllPerformance, RaceResult } from './utils/raceAll';
import * as packageJson from '../package.json';
//const componentsContext = require.context('./components', true, /\.ts$/);
const componentsContext = require.context('./components', true, /^(?!.*\.test\.ts$).*\.ts$/);
componentsContext.keys().forEach(componentsContext);

interface fingerprintOptionsInterface {
    [key: string]: string | boolean | number;
}

interface fingerprintRaceResultsInterface {
    [key: string]: RaceResult<componentInterface>
}
export async function getFingerprintData(opts?: fingerprintOptionsInterface): Promise<fingerprintRaceResultsInterface>  {
    try {
            
        const timeout = 1000;
        const promiseMap = getComponentPromises();
        const keys = Object.keys(promiseMap);
        const promises = Object.values(promiseMap);
        const resolvedValues = await raceAllPerformance(promises, timeout, timeoutInstance );
        const resolvedComponents: { [key: string]: RaceResult<componentInterface> } = {};
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
        const fingerprintData: fingerprintRaceResultsInterface = await getFingerprintData();
        const thisHash = hash(JSON.stringify(cleanElapsed(fingerprintData))).toString();
        console.log(JSON.stringify(fingerprintData), thisHash)
        return thisHash;
    } catch (error) {
        throw error;
    }
}

function cleanElapsed(components: fingerprintRaceResultsInterface) {
    Object.keys(components).forEach((key) => {
        if (components[key].hasOwnProperty('elapsed')) {
            // Delete the key 'elapsed' from the second-level dictionary
            delete components[key]['elapsed'];
        }
    }) 
    return components
}

export function getVersion(): string {
    return packageJson.version;
}