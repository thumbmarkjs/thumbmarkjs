import { getFingerprint, getFingerprintData } from './fingerprint/functions';
import * as packageJson from '../package.json';
import './components'

//const componentsContext = require.context('./components', true, /^(?!.*\.test\.ts$).*\.ts$/);
//componentsContext.keys().forEach(componentsContext);

interface fingerprintOptionsInterface {
    showElapsed?: boolean
}

const options: fingerprintOptionsInterface = {
    showElapsed: false
}

function getVersion(): string {
    return packageJson.version;
}

export { getVersion, getFingerprint, getFingerprintData, options }