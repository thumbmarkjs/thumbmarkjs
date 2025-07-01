import { getFingerprint, getFingerprintData, getFingerprintPerformance, getVersion } from './fingerprint/functions'
import { getThumbmark } from './fingerprint/tm_functions'
import { setOption } from './fingerprint/options'
import { includeComponent } from './factory'
import { Thumbmark } from './thumbmark'
import './components'

export { Thumbmark, getThumbmark, setOption, getVersion, getFingerprint, getFingerprintData, getFingerprintPerformance, includeComponent }