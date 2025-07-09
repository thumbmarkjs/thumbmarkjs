import { componentInterface, includeComponent } from '../../factory';
import { getBrowser } from './browser'

export default function getSystem(): Promise<componentInterface> {
    return new Promise((resolve) => {
        const browser = getBrowser()

        const result: componentInterface = {
        'platform': window.navigator.platform,
        'productSub': navigator.productSub,
        'product': navigator.product,
        'useragent': navigator.userAgent,
        'hardwareConcurrency': navigator.hardwareConcurrency,
        'browser': {'name': browser.name, 'version': browser.version },
        }
        // Safari handles these differently in an iFrame so removing them from components
        if (browser.name.toLowerCase() !== 'safari') {
            result['applePayVersion'] = getApplePayVersion();
            result['cookieEnabled'] = window.navigator.cookieEnabled;
        }
        resolve(result);
    });
};

/**
 * @returns applePayCanMakePayments: boolean, applePayMaxSupportedVersion: number
 */
function getApplePayVersion(): number {
    if (window.location.protocol === 'https:' && typeof (window as any).ApplePaySession === 'function') {
        try {
            const versionCheck = (window as any).ApplePaySession.supportsVersion;
            for (let i = 15; i > 0; i--) {
                if (versionCheck(i)) {
                    return i;
                }
            }
        } catch (error) {
            return 0
        }
    }
    return 0
}