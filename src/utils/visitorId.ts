import { optionsInterface } from "../options";

/**
 * Visitor ID storage utilities - localStorage only, server generates IDs
 */

/**
 * Gets visitor ID from localStorage, returns null if unavailable
 */
export function getVisitorId(_options: optionsInterface): string | null {
    try {
        return localStorage.getItem(_options.storage_property_name);
    } catch {
        return null;
    }
}

/**
 * Sets visitor ID in localStorage
 */
export function setVisitorId(visitorId: string, _options: optionsInterface): void {
    try {
        localStorage.setItem(_options.storage_property_name, visitorId);
    } catch {
        // Ignore storage errors
    }
}