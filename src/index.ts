import { getFingerprint, getFingerprintData, getFingerprintPerformance } from './fingerprint/functions'
import { setOption } from './fingerprint/options'
import * as packageJson from '../package.json'
import './components'

function getVersion(): string {
    return packageJson.version
}

export { setOption, getVersion, getFingerprint, getFingerprintData, getFingerprintPerformance }