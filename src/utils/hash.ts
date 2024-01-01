/**
 * We'll just use MD5 for now, but this can be replaced with something smaller, more efficient later if needed.
 */

import { Md5 } from 'ts-md5';

function hash(object: Object): String {
    return Md5.hashStr(JSON.stringify(object));
}

export { hash }
/*
import { createHash } from 'crypto';

function hash(input: string): string {
  const hash = createHash('sha256'); // Selecting the SHA-256 algorithm
  hash.update(input);
  return hash.digest('hex'); // Get the hash in hexadecimal format
}

export { hash }*/