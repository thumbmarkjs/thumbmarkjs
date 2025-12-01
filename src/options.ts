export interface optionsInterface {
    storage_property_name?: string,
    exclude?: string[],
    include?: string[],
    permissions_to_check?: PermissionName[],
    timeout?: number,
    logging?: boolean,
    api_key?: string,
    api_endpoint?: string,
    cache_api_call?: boolean,
    performance?: boolean,
    stabilize?: string[],
    experimental?: boolean,
}

export const DEFAULT_API_ENDPOINT = 'https://api.thumbmarkjs.com';

export const defaultOptions: optionsInterface = {
    exclude: [],
    include: [],
    stabilize: ['private', 'iframe'],
    logging: true,
    timeout: 5000,
    cache_api_call: true,
    performance: false,
    experimental: false,
};

export let options = { ...defaultOptions };
/**
 * 
 * @param key @deprecated this function will be removed
 * @param value 
 */
export function setOption<K extends keyof optionsInterface>(key: K, value: optionsInterface[K]) {
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