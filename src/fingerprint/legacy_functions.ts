/**
 * This file is here to support legacy implementations.
 * Eventually, these functions will be removed to keep the library small.
 */

import { componentInterface } from '../factory'
import { options} from './options'
import { resolveClientComponents, getThumbmark } from './functions';
import { tm_component_promises } from "../factory";

/**
 * 
 * @deprecated
 */
export async function getFingerprintData() {
    const thumbmarkData = await getThumbmark(options);
    return thumbmarkData.components;
}

/**
 * 
 * @param includeData boolean
 * @deprecated this function is going to be removed. use getThumbmark or Thumbmark class instead.
 */
export async function getFingerprint(includeData?: false): Promise<string>
export async function getFingerprint(includeData: true): Promise<{ hash: string, data: componentInterface }>
export async function getFingerprint(includeData?: boolean): Promise<string | { hash: string, data: componentInterface }> {
    try {
        const thumbmarkData = await getThumbmark(options);
        if (includeData) {
            return { hash: thumbmarkData.thumbmark.toString(), data: thumbmarkData.components}
        } else {
            return thumbmarkData.thumbmark.toString()
        }
    } catch (error) {
        throw error
    }
}
/**
 * 
 * @deprecated use Thumbmark or getThumbmark instead with options
 */
export async function getFingerprintPerformance() {
    try {
        const { elapsed, resolvedComponents } = await resolveClientComponents(tm_component_promises, options);
        // Legacy format: merge resolvedComponents and elapsed into one object
        return {
            ...resolvedComponents,
            elapsed
        };
    } catch (error) {
        throw error;
    }
}