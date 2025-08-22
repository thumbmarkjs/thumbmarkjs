import {
    getFingerprint,
    getFingerprintData,
    getFingerprintPerformance
 } from './functions/legacy_functions'
import { getThumbmark } from './functions'
import { getVersion } from './utils/version';
import { setOption, optionsInterface, stabilizationExclusionRules } from './options'
import { includeComponent } from './factory'
import { Thumbmark } from './thumbmark'
import { filterThumbmarkData } from './functions/filterComponents'

export { Thumbmark, getThumbmark, getVersion,
    
    // Filtering functions for server-side use
    filterThumbmarkData, optionsInterface, stabilizationExclusionRules,

    // deprecated functions. Don't use anymore.
    setOption, getFingerprint, getFingerprintData, getFingerprintPerformance, includeComponent
}