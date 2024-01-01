import { componentInterface, includeComponent } from '../../factory';

function getSystemDetails(): Promise<componentInterface> {
    return new Promise((resolve) => {
        resolve( {
        'platform': window.navigator.platform,
        'cookieEnabled': window.navigator.cookieEnabled,
        'productSub': navigator.productSub,
        'product': navigator.product,
        'useragent': navigator.userAgent
    });
});
}

includeComponent('system', getSystemDetails);