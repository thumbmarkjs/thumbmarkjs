/**
 * Stable JSON stringify implementation
 * Based on fast-json-stable-stringify by Evgeny Poberezkin
 * https://github.com/epoberezkin/fast-json-stable-stringify
 * 
 * This implementation ensures consistent JSON serialization by sorting object keys,
 * which is critical for generating stable hashes from fingerprint data.
 */

/**
 * Converts data to a stable JSON string with sorted keys
 * 
 * @param data - The data to stringify
 * @returns Stable JSON string representation
 * @throws TypeError if circular reference is detected
 * 
 * @example
 * ```typescript
 * const obj = { b: 2, a: 1 };
 * stableStringify(obj); // '{"a":1,"b":2}'
 * ```
 */
export function stableStringify(data: any): string {

    const seen: any[] = [];

    return (function stringify(node: any): string | undefined {
        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        if (node === undefined) return;
        if (typeof node === 'number') return isFinite(node) ? '' + node : 'null';
        if (typeof node !== 'object') return JSON.stringify(node);

        let i: number;
        let out: string;

        if (Array.isArray(node)) {
            out = '[';
            for (i = 0; i < node.length; i++) {
                if (i) out += ',';
                out += stringify(node[i]) || 'null';
            }
            return out + ']';
        }

        if (node === null) return 'null';

        if (seen.indexOf(node) !== -1) {
            throw new TypeError('Converting circular structure to JSON');
        }

        const seenIndex = seen.push(node) - 1;
        const keys = Object.keys(node).sort();
        out = '';

        for (i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = stringify(node[key]);

            if (!value) continue;
            if (out) out += ',';
            out += JSON.stringify(key) + ':' + value;
        }

        seen.splice(seenIndex, 1);
        return '{' + out + '}';
    })(data) || '';
}
