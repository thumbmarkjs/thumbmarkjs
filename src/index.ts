import { getFingerprint, getFingerprintData, getFingerprintPerformance } from './fingerprint/functions';
import * as packageJson from '../package.json';
import './components'

function getVersion(): string {
    return packageJson.version;
}

export { getVersion, getFingerprint, getFingerprintData, getFingerprintPerformance }