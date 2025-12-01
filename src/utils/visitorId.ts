import { optionsInterface } from "../options";

/**
 * Visitor ID storage utilities - localStorage only, server generates IDs
 */

const DEFAULT_STORAGE_PROPERTY_NAME = 'thumbmark_visitor_id';

/**
 * Gets visitor ID from localStorage, returns null if unavailable
 */
export function getVisitorId(_options: optionsInterface): string | null {
    const storagePropertyName = _options.storage_property_name || DEFAULT_STORAGE_PROPERTY_NAME;
    try {
        return localStorage.getItem(storagePropertyName);
    } catch {
        return null;
    }
}

/**
 * Sets visitor ID in localStorage
 */
export function setVisitorId(visitorId: string, _options: optionsInterface): void {
    const storagePropertyName = _options.storage_property_name || DEFAULT_STORAGE_PROPERTY_NAME;
    try {
        localStorage.setItem(storagePropertyName, visitorId);
    } catch {
        // Ignore storage errors
    }
}