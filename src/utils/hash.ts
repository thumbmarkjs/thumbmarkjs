/**
 * This code is taken from https://github.com/LinusU/murmur-128/blob/master/index.js
 * But instead of dependencies to encode-utf8 and fmix, I've implemented them here.
 */

function encodeUtf8(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(text).buffer;
}

function fmix (input : number) : number {
  input ^= (input >>> 16)
  input = Math.imul(input, 0x85ebca6b)
  input ^= (input >>> 13)
  input = Math.imul(input, 0xc2b2ae35)
  input ^= (input >>> 16)

  return (input >>> 0)
}

const C = new Uint32Array([
  0x239b961b,
  0xab0e9789,
  0x38b34ae5,
  0xa1e38b93
])

function rotl (m : number, n : number) : number {
  return (m << n) | (m >>> (32 - n))
}

function body (key : ArrayBuffer, hash : Uint32Array) {
  const blocks = (key.byteLength / 16) | 0
  const view32 = new Uint32Array(key, 0, blocks * 4)

  for (let i = 0; i < blocks; i++) {
    const k = view32.subarray(i * 4, (i + 1) * 4)

    k[0] = Math.imul(k[0], C[0])
    k[0] = rotl(k[0], 15)
    k[0] = Math.imul(k[0], C[1])

    hash[0] = (hash[0] ^ k[0])
    hash[0] = rotl(hash[0], 19)
    hash[0] = (hash[0] + hash[1])
    hash[0] = Math.imul(hash[0], 5) + 0x561ccd1b

    k[1] = Math.imul(k[1], C[1])
    k[1] = rotl(k[1], 16)
    k[1] = Math.imul(k[1], C[2])

    hash[1] = (hash[1] ^ k[1])
    hash[1] = rotl(hash[1], 17)
    hash[1] = (hash[1] + hash[2])
    hash[1] = Math.imul(hash[1], 5) + 0x0bcaa747

    k[2] = Math.imul(k[2], C[2])
    k[2] = rotl(k[2], 17)
    k[2] = Math.imul(k[2], C[3])

    hash[2] = (hash[2] ^ k[2])
    hash[2] = rotl(hash[2], 15)
    hash[2] = (hash[2] + hash[3])
    hash[2] = Math.imul(hash[2], 5) + 0x96cd1c35

    k[3] = Math.imul(k[3], C[3])
    k[3] = rotl(k[3], 18)
    k[3] = Math.imul(k[3], C[0])

    hash[3] = (hash[3] ^ k[3])
    hash[3] = rotl(hash[3], 13)
    hash[3] = (hash[3] + hash[0])
    hash[3] = Math.imul(hash[3], 5) + 0x32ac3b17
  }
}

function tail (key : ArrayBuffer, hash : Uint32Array) {
  const blocks = (key.byteLength / 16) | 0
  const reminder = (key.byteLength % 16)

  const k = new Uint32Array(4)
  const tail = new Uint8Array(key, blocks * 16, reminder)

  switch (reminder) {
    case 15:
      k[3] = (k[3] ^ (tail[14] << 16))
      // fallthrough
    case 14:
      k[3] = (k[3] ^ (tail[13] << 8))
      // fallthrough
    case 13:
      k[3] = (k[3] ^ (tail[12] << 0))

      k[3] = Math.imul(k[3], C[3])
      k[3] = rotl(k[3], 18)
      k[3] = Math.imul(k[3], C[0])
      hash[3] = (hash[3] ^ k[3])
      // fallthrough
    case 12:
      k[2] = (k[2] ^ (tail[11] << 24))
      // fallthrough
    case 11:
      k[2] = (k[2] ^ (tail[10] << 16))
      // fallthrough
    case 10:
      k[2] = (k[2] ^ (tail[9] << 8))
      // fallthrough
    case 9:
      k[2] = (k[2] ^ (tail[8] << 0))

      k[2] = Math.imul(k[2], C[2])
      k[2] = rotl(k[2], 17)
      k[2] = Math.imul(k[2], C[3])
      hash[2] = (hash[2] ^ k[2])
      // fallthrough
    case 8:
      k[1] = (k[1] ^ (tail[7] << 24))
      // fallthrough
    case 7:
      k[1] = (k[1] ^ (tail[6] << 16))
      // fallthrough
    case 6:
      k[1] = (k[1] ^ (tail[5] << 8))
      // fallthrough
    case 5:
      k[1] = (k[1] ^ (tail[4] << 0))

      k[1] = Math.imul(k[1], C[1])
      k[1] = rotl(k[1], 16)
      k[1] = Math.imul(k[1], C[2])
      hash[1] = (hash[1] ^ k[1])
      // fallthrough
    case 4:
      k[0] = (k[0] ^ (tail[3] << 24))
      // fallthrough
    case 3:
      k[0] = (k[0] ^ (tail[2] << 16))
      // fallthrough
    case 2:
      k[0] = (k[0] ^ (tail[1] << 8))
      // fallthrough
    case 1:
      k[0] = (k[0] ^ (tail[0] << 0))

      k[0] = Math.imul(k[0], C[0])
      k[0] = rotl(k[0], 15)
      k[0] = Math.imul(k[0], C[1])
      hash[0] = (hash[0] ^ k[0])
  }
}

function finalize (key : ArrayBuffer, hash : Uint32Array) {
  hash[0] = (hash[0] ^ key.byteLength)
  hash[1] = (hash[1] ^ key.byteLength)
  hash[2] = (hash[2] ^ key.byteLength)
  hash[3] = (hash[3] ^ key.byteLength)

  hash[0] = (hash[0] + hash[1]) | 0
  hash[0] = (hash[0] + hash[2]) | 0
  hash[0] = (hash[0] + hash[3]) | 0

  hash[1] = (hash[1] + hash[0]) | 0
  hash[2] = (hash[2] + hash[0]) | 0
  hash[3] = (hash[3] + hash[0]) | 0

  hash[0] = fmix(hash[0])
  hash[1] = fmix(hash[1])
  hash[2] = fmix(hash[2])
  hash[3] = fmix(hash[3])

  hash[0] = (hash[0] + hash[1]) | 0
  hash[0] = (hash[0] + hash[2]) | 0
  hash[0] = (hash[0] + hash[3]) | 0

  hash[1] = (hash[1] + hash[0]) | 0
  hash[2] = (hash[2] + hash[0]) | 0
  hash[3] = (hash[3] + hash[0]) | 0
}

export function hash (key : ArrayBuffer | string, seed = 0) : string {
  seed = (seed ? (seed | 0) : 0)

  if (typeof key === 'string') {
    key = encodeUtf8(key)
  }

  if (!(key instanceof ArrayBuffer)) {
    throw new TypeError('Expected key to be ArrayBuffer or string')
  }

  const hash = new Uint32Array([seed, seed, seed, seed])

  body(key, hash)
  tail(key, hash)
  finalize(key, hash)
  const byteArray = new Uint8Array(hash.buffer);
  return Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join('');
}