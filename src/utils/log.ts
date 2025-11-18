import { componentInterface } from '../factory';
import { optionsInterface, DEFAULT_API_ENDPOINT } from '../options';
import { getVersion } from './version';

// ===================== Logging (Internal) =====================

/**
 * Logs thumbmark data to remote logging endpoint (only once per session)
 * You can disable this by setting options.logging to false.
 * @internal
 */
export async function logThumbmarkData(thisHash: string, thumbmarkData: componentInterface, options: optionsInterface, experimentalData: componentInterface = {}): Promise<void> {
    const apiEndpoint = DEFAULT_API_ENDPOINT;
    const url = `${apiEndpoint}/log`;
    const payload = {
        thumbmark: thisHash,
        components: thumbmarkData,
        experimental: experimentalData,
        version: getVersion(),
        options,
        path: window?.location?.pathname,
    };

    sessionStorage.setItem("_tmjs_l", "1");
    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch { /* do nothing */ }

}