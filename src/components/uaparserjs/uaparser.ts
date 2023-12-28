import { componentInterface, includeComponent } from '../../factory';


/**
 * Might want to replace this with a different implementation, since this is a few KBs
 */

import { UAParser } from 'ua-parser-js'

function browserDetails(): Promise<componentInterface> {
    
    return new Promise((resolve) => {
        let parser = new UAParser(navigator.userAgent);
        const browser = parser.getBrowser();
        const engine = parser.getEngine();
        const device = parser.getDevice();
        const os = parser.getOS();
        const cpu = parser.getCPU();

        resolve( {
        'browser': [browser.name, browser.version].join("|"),
        'engine': [engine.name, engine.version].join("|"),
        'device': [device.model, device.type, device.vendor].join("|"),
        'os': [os.name, os.version].join("|"),
        'cpu': cpu.architecture,
    });
});
}

includeComponent('uaparserjs', browserDetails);