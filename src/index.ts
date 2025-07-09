import {
    getFingerprint,
    getFingerprintData,
    getFingerprintPerformance
 } from './fingerprint/legacy_functions'
import { getThumbmark, getVersion } from './fingerprint/functions'
import { setOption } from './fingerprint/options'
import { includeComponent } from './factory'
import { Thumbmark } from './thumbmark'

export { Thumbmark, getThumbmark, getVersion,

    // deprecated functions. Don't use anymore.
    setOption, getFingerprint, getFingerprintData, getFingerprintPerformance, includeComponent
}