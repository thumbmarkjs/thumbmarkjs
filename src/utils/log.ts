import { componentInterface } from '../factory';
import { optionsInterface, DEFAULT_API_ENDPOINT } from '../options';
import { getVersion } from './version';
import { getExperimentalPayload } from './experimental';
import type { ThumbmarkError } from '../functions';

// ===================== Logging (Internal) =====================

/**
 * Logs thumbmark data to remote logging endpoint (only once per session)
 * You can disable this by setting options.logging to false.
 *
 * The experimental payload is fetched here rather than by the caller because
 * this is its only consumer. That keeps it off getThumbmark's critical path —
 * this whole function is fire-and-forget, so the round-trip costs the caller
 * nothing.
 * @internal
 */
export async function logThumbmarkData(thisHash: string, thumbmarkData: componentInterface, options: optionsInterface, errors: ThumbmarkError[] = []): Promise<void> {
    const apiEndpoint = DEFAULT_API_ENDPOINT;
    const url = `${apiEndpoint}/log`;

    sessionStorage.setItem("_tmjs_l", "1");

    const payload = {
        thumbmark: thisHash,
        components: thumbmarkData,
        experimental: await getExperimentalPayload(),
        version: getVersion(),
        options,
        path: window?.location?.pathname,
        ...(errors.length > 0 && { errors }),
    };

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