import { DEFAULT_STORAGE_PREFIX, OptionsAfterDefaults } from "../options";

/**
 * Visitor ID storage utilities - localStorage only, server generates IDs
 */

const DEFAULT_STORAGE_PROPERTY_NAME = 'visitor_id';

/**
 * Get the storage property name for visitor id
 * @param _options
 */
export function getVisitorIdPropertyName(
    _options: Pick<OptionsAfterDefaults, 'storage_property_name' | 'property_name_factory'>
): string {
    if(_options.storage_property_name) {
        return _options.storage_property_name;
    }

    return _options.property_name_factory(DEFAULT_STORAGE_PROPERTY_NAME);
}

const DEFAULT_VISITOR_ID_NAME = `${DEFAULT_STORAGE_PREFIX}_${DEFAULT_STORAGE_PROPERTY_NAME}`;
/**
 * Gets visitor ID from localStorage, returns null if unavailable
 */
export function getVisitorId(_options: OptionsAfterDefaults): string | null {
    try {
        const propertyName = getVisitorIdPropertyName(_options);
        let visitorId = localStorage.getItem(propertyName);
        if(!visitorId && propertyName !== DEFAULT_VISITOR_ID_NAME) {
            // Migration case in case going from thumbmark prefix to a custom one
            visitorId = localStorage.getItem(DEFAULT_VISITOR_ID_NAME);
            if(visitorId) {
                setVisitorId(visitorId, _options);
            }
        }

        return visitorId;
    } catch {
        return null;
    }
}

/**
 * Sets visitor ID in localStorage
 */
export function setVisitorId(visitorId: string, _options: OptionsAfterDefaults): void {
    try {
        localStorage.setItem(getVisitorIdPropertyName(_options), visitorId);
    } catch {
        // Ignore storage errors
    }
}