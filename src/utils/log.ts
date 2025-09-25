import { componentInterface } from '../factory';
import { optionsInterface } from '../options';
import { getVersion } from './version';
import { API_ENDPOINT } from '../options';

// ===================== Logging (Internal) =====================

/**
 * Logs thumbmark data to remote logging endpoint (only once per session)
 * You can disable this by setting options.logging to false.
 * @internal
 */
export async function logThumbmarkData(thisHash: string, thumbmarkData: componentInterface, options: optionsInterface, experimentalData: componentInterface = {}): Promise<void> {
    const url = `${API_ENDPOINT}/log`;
    const payload = {
        thumbmark: thisHash,
        components: thumbmarkData,
        experimental: experimentalData,
        version: getVersion(),
        options,
        path: window?.location?.pathname,
    };
    if (!sessionStorage.getItem("_tmjs_l") && Math.random() < 0.0001) { // Only log once per session and very rarely
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
}