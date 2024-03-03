import { componentInterface, includeComponent } from '../../factory';
import { getBrowser } from './browser'

function getSystemDetails(): Promise<componentInterface> {
    return new Promise((resolve) => {
        const browser = getBrowser()
        resolve( {
        'platform': window.navigator.platform,
        'cookieEnabled': window.navigator.cookieEnabled,
        'productSub': navigator.productSub,
        'product': navigator.product,
        'useragent': navigator.userAgent,
        'browser': {'name': browser.name, 'version': browser.version },
        'applePayVersion': getApplePayVersion()
    });
});
}

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

includeComponent('system', getSystemDetails);

