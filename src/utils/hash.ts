/**
 * We'll just use MD5 for now, but this can be replaced with something smaller, more efficient later if needed.
 */

import { Md5 } from 'ts-md5';

function hash(object: Object): String {
    return Md5.hashStr(JSON.stringify(object));
}

export { hash }