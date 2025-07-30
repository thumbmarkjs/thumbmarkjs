import {
    getFingerprint,
    getFingerprintData,
    getFingerprintPerformance
 } from './functions/legacy_functions'
import { getThumbmark } from './functions'
import { getVersion } from './utils/version';
import { setOption } from './options'
import { includeComponent } from './factory'
import { Thumbmark } from './thumbmark'

export { Thumbmark, getThumbmark, getVersion,

    // deprecated functions. Don't use anymore.
    setOption, getFingerprint, getFingerprintData, getFingerprintPerformance, includeComponent
}