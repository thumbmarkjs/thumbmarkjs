/**
 * Visitor ID storage utilities - localStorage only, server generates IDs
 */

const VISITOR_ID_KEY = 'thumbmark_visitor_id';

/**
 * Gets visitor ID from localStorage, returns null if unavailable
 */
export function getVisitorId(): string | null {
    try {
        return localStorage.getItem(VISITOR_ID_KEY);
    } catch {
        return null;
    }
}

/**
 * Sets visitor ID in localStorage
 */
export function setVisitorId(visitorId: string): void {
    try {
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
    } catch {
        // Ignore storage errors
    }
}