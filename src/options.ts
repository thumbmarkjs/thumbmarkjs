export interface OptionsAfterDefaults {
    /**
     * A function to customise localStorage names used by thumbmark
     * @param name Original name of the storage property eg. visitor_id
     * @returns The name under which the storage property should be saved eg. myprefix_visitor_id
     */
    property_name_factory: (name: string) => string,
    /**
     * @deprecated use property_name_factory
     */
    storage_property_name?: string,
    exclude?: string[],
    include?: string[],
    permissions_to_check?: PermissionName[],
    timeout?: number,
    logging?: boolean,
    api_key?: string,
    api_endpoint?: string,
    /**
     * @deprecated This will be removed in Thumbmarkjs 2.0, use cache_lifetime_in_ms instead
     */
    cache_api_call?: boolean,
    /**
     * How long the cache will be valid for, maximum is 72h (259_200_000)
     */
    cache_lifetime_in_ms: number,
    performance?: boolean,
    stabilize?: string[],
    experimental?: boolean,
}

export type optionsInterface = Partial<OptionsAfterDefaults>;

// Default to zero to avoid breaking existing integrations
export const DEFAULT_CACHE_LIFETIME = 0;
export const MAXIMUM_CACHE_LIFETIME = 259_200_000;
export const DEFAULT_STORAGE_PREFIX = 'thumbmark';
export const DEFAULT_API_ENDPOINT = 'https://api.thumbmarkjs.com';

export const defaultOptions: OptionsAfterDefaults = {
    exclude: [],
    include: [],
    stabilize: ['private', 'iframe'],
    logging: true,
    timeout: 5000,
    cache_api_call: true,
    cache_lifetime_in_ms: DEFAULT_CACHE_LIFETIME,
    performance: false,
    experimental: false,
    property_name_factory: (name: string) => {
        return `${DEFAULT_STORAGE_PREFIX}_${name}`;
    },
};

export let options: OptionsAfterDefaults = { ...defaultOptions };
/**
 * 
 * @param key @deprecated this function will be removed
 * @param value 
 */
export function setOption<K extends keyof optionsInterface>(key: K, value: OptionsAfterDefaults[K]) {
    options[key] = value;
}

export const stabilizationExclusionRules = {
    'private': [
        { exclude: ['canvas'], browsers: ['firefox', 'safari>=17', 'brave'] },
        { exclude: ['audio'], browsers: ['samsungbrowser', 'safari'] },
        { exclude: ['fonts'], browsers: ['firefox'] },
        { exclude: ['audio.sampleHash', 'hardware.deviceMemory', 'header.acceptLanguage.q', 'system.hardwareConcurrency', 'plugins'], browsers: ['brave'] },
        { exclude: ['tls.extensions'], browsers: ['firefox', 'chrome', 'safari'] },
        { exclude: ['header.acceptLanguage'], browsers: ['edge', 'chrome'] },
    ],
    'iframe': [
        {
            exclude: [
                'system.applePayVersion',
                'system.cookieEnabled',
            ],
            browsers: ['safari']
        },
        {
            exclude: ['permissions']
        }
    ],
    'vpn': [
        { exclude: ['ip'] },
    ],
}