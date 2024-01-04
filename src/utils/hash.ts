// MurmurHash3 constants
const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;
const C3 = 0xe6546b64;
const C4 = 0x85ebca6b;
const C5 = 0xc2b2ae35;

// Helper functions to perform bitwise operations on 32-bit integers
function rotl32(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r));
}

function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, C4);
  h ^= h >>> 13;
  h = Math.imul(h, C5);
  h ^= h >>> 16;
  return h;
}

// MurmurHash3 x86 32-bit hash function
export function hash(key: string, seed: number = 0): string {
  let h = seed;
  let k = 0;
  let remainder = key.length & 3; // key.length % 4
  let bytes = key.length - remainder;
  let i = 0;

  // Process key in 4-byte chunks
  while (i < bytes) {
    k =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    // Mix k into h
    k = Math.imul(k, C1);
    k = rotl32(k, 15);
    k = Math.imul(k, C2);
    h ^= k;
    h = rotl32(h, 13);
    h = Math.imul(h, 5) + C3;
  }

  // Process remaining bytes
  k = 0;
  switch (remainder) {
    case 3:
      k ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k ^= key.charCodeAt(i) & 0xff;
      k = Math.imul(k, C1);
      k = rotl32(k, 15);
      k = Math.imul(k, C2);
      h ^= k;
  }

  // Finalize and return
  h ^= key.length;
  h = fmix32(h);
  const v = h >>> 0; // Convert to unsigned 32-bit integer
  return v.toString(36); // Conver to base-36 string
}
