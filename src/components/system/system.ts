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
        'browser': {'name': browser.name, 'version': browser.version }
    });
});
}

includeComponent('system', getSystemDetails);