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
        'applePayInfo': getApplePayInfo()
    });
});
}

/**
 * @returns applePayCanMakePayments: boolean, applePayMaxSupportedVersion: number
 */
function getApplePayInfo(): { applePayCanMakePayments: boolean, applePayMaxSupportedVersion: number } {
    let applePayCanMakePayments = false;
    let applePayMaxSupportedVersion = 0;

    if (typeof (window as any).ApplePaySession === 'function') {
        const versionCheck = (window as any).ApplePaySession.supportsVersion;
        let version = 0;
        while (versionCheck(version + 1)) {
            version++;
        }
        applePayCanMakePayments = version > 0;
        applePayMaxSupportedVersion = version;
    }

    return {
        applePayCanMakePayments,
        applePayMaxSupportedVersion
    };
}

includeComponent('system', getSystemDetails);

