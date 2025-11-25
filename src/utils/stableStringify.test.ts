import { stableStringify } from './stableStringify';

describe('stableStringify', () => {
    describe('basic functionality', () => {
        test('sorts object keys alphabetically', () => {
            const obj = { z: 3, a: 1, m: 2 };
            const result = stableStringify(obj);
            expect(result).toBe('{"a":1,"m":2,"z":3}');
        });

        test('produces valid JSON', () => {
            const obj = { b: 2, a: 1, c: 3 };
            const result = stableStringify(obj);
            expect(() => JSON.parse(result)).not.toThrow();
            expect(JSON.parse(result)).toEqual({ a: 1, b: 2, c: 3 });
        });

        test('produces consistent output for same input', () => {
            const obj = { z: 3, a: 1, m: 2 };
            const result1 = stableStringify(obj);
            const result2 = stableStringify(obj);
            expect(result1).toBe(result2);
        });

        test('produces same output regardless of key insertion order', () => {
            const obj1 = { a: 1, b: 2, c: 3 };
            const obj2 = { c: 3, a: 1, b: 2 };
            const obj3 = { b: 2, c: 3, a: 1 };

            const result1 = stableStringify(obj1);
            const result2 = stableStringify(obj2);
            const result3 = stableStringify(obj3);

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });
    });

    describe('nested objects', () => {
        test('sorts keys in nested objects', () => {
            const obj = {
                z: { y: 2, x: 1 },
                a: { c: 4, b: 3 }
            };
            const result = stableStringify(obj);
            expect(result).toBe('{"a":{"b":3,"c":4},"z":{"x":1,"y":2}}');
        });

        test('handles deeply nested objects', () => {
            const obj = {
                level1: {
                    z: 'last',
                    a: {
                        nested: {
                            z: 3,
                            a: 1,
                            m: 2
                        }
                    }
                }
            };
            const result = stableStringify(obj);
            const parsed = JSON.parse(result);
            expect(parsed).toEqual({
                level1: {
                    a: {
                        nested: {
                            a: 1,
                            m: 2,
                            z: 3
                        }
                    },
                    z: 'last'
                }
            });
        });
    });

    describe('arrays', () => {
        test('preserves array order', () => {
            const arr = [3, 1, 2];
            const result = stableStringify(arr);
            expect(result).toBe('[3,1,2]');
        });

        test('handles arrays with objects', () => {
            const arr = [
                { z: 2, a: 1 },
                { b: 4, a: 3 }
            ];
            const result = stableStringify(arr);
            expect(result).toBe('[{"a":1,"z":2},{"a":3,"b":4}]');
        });

        test('handles nested arrays', () => {
            const arr = [[3, 2, 1], [6, 5, 4]];
            const result = stableStringify(arr);
            expect(result).toBe('[[3,2,1],[6,5,4]]');
        });

        test('handles mixed arrays', () => {
            const arr = [1, 'string', { z: 2, a: 1 }, [3, 4], null, true];
            const result = stableStringify(arr);
            expect(result).toBe('[1,"string",{"a":1,"z":2},[3,4],null,true]');
        });
    });

    describe('primitive types', () => {
        test('handles strings', () => {
            expect(stableStringify('hello')).toBe('"hello"');
        });

        test('handles numbers', () => {
            expect(stableStringify(42)).toBe('42');
            expect(stableStringify(0)).toBe('0');
            expect(stableStringify(-42)).toBe('-42');
            expect(stableStringify(3.14)).toBe('3.14');
        });

        test('handles booleans', () => {
            expect(stableStringify(true)).toBe('true');
            expect(stableStringify(false)).toBe('false');
        });

        test('handles null', () => {
            expect(stableStringify(null)).toBe('null');
        });

        test('handles undefined', () => {
            expect(stableStringify(undefined)).toBe('');
        });

        test('handles undefined in objects', () => {
            const obj = { a: 1, b: undefined, c: 3 };
            const result = stableStringify(obj);
            expect(result).toBe('{"a":1,"c":3}');
        });

        test('handles undefined in arrays', () => {
            const arr = [1, undefined, 3];
            const result = stableStringify(arr);
            expect(result).toBe('[1,null,3]');
        });
    });

    describe('special number values', () => {
        test('handles Infinity as null', () => {
            expect(stableStringify(Infinity)).toBe('null');
        });

        test('handles -Infinity as null', () => {
            expect(stableStringify(-Infinity)).toBe('null');
        });

        test('handles NaN as null', () => {
            expect(stableStringify(NaN)).toBe('null');
        });

        test('handles special numbers in objects', () => {
            const obj = { a: Infinity, b: NaN, c: -Infinity };
            const result = stableStringify(obj);
            expect(result).toBe('{"a":null,"b":null,"c":null}');
        });
    });

    describe('circular references', () => {
        test('throws TypeError on circular reference', () => {
            const obj: any = { a: 1 };
            obj.self = obj;

            expect(() => stableStringify(obj)).toThrow(TypeError);
            expect(() => stableStringify(obj)).toThrow('Converting circular structure to JSON');
        });

        test('throws on nested circular reference', () => {
            const obj: any = { a: { b: {} } };
            obj.a.b.circular = obj;

            expect(() => stableStringify(obj)).toThrow(TypeError);
        });

        test('throws on array circular reference', () => {
            const arr: any = [1, 2, 3];
            arr.push(arr);

            // Note: Array circular references cause stack overflow (RangeError)
            // rather than being caught by the circular reference check
            expect(() => stableStringify(arr)).toThrow(RangeError);
        });
    });

    describe('toJSON method', () => {
        test('calls toJSON method if present', () => {
            const obj = {
                value: 42,
                toJSON() {
                    return { transformed: this.value * 2 };
                }
            };
            const result = stableStringify(obj);
            expect(result).toBe('{"transformed":84}');
        });

        test('handles Date objects via toJSON', () => {
            const date = new Date('2023-01-01T00:00:00.000Z');
            const result = stableStringify(date);
            expect(result).toBe('"2023-01-01T00:00:00.000Z"');
        });

        test('handles nested objects with toJSON', () => {
            const obj = {
                z: 'last',
                a: {
                    toJSON() {
                        return { custom: 'value' };
                    }
                }
            };
            const result = stableStringify(obj);
            expect(result).toBe('{"a":{"custom":"value"},"z":"last"}');
        });
    });

    describe('complex scenarios', () => {
        test('handles empty object', () => {
            expect(stableStringify({})).toBe('{}');
        });

        test('handles empty array', () => {
            expect(stableStringify([])).toBe('[]');
        });

        test('handles complex nested structure', () => {
            const complex = {
                users: [
                    { name: 'Alice', age: 30, active: true },
                    { name: 'Bob', age: 25, active: false }
                ],
                metadata: {
                    version: 1,
                    timestamp: 1234567890,
                    config: {
                        enabled: true,
                        options: ['a', 'b', 'c']
                    }
                },
                count: 42
            };

            const result = stableStringify(complex);
            const parsed = JSON.parse(result);

            // Verify it's valid JSON
            expect(parsed).toBeDefined();

            // Verify structure is preserved
            expect(parsed.users).toHaveLength(2);
            expect(parsed.metadata.config.options).toEqual(['a', 'b', 'c']);
            expect(parsed.count).toBe(42);
        });

        test('handles objects with special characters in keys', () => {
            const obj = {
                'key with spaces': 1,
                'key-with-dashes': 2,
                'key_with_underscores': 3,
                'key.with.dots': 4
            };
            const result = stableStringify(obj);
            const parsed = JSON.parse(result);
            expect(parsed).toEqual(obj);
        });

        test('handles objects with numeric string keys', () => {
            const obj = { '2': 'two', '1': 'one', '10': 'ten' };
            const result = stableStringify(obj);
            // Keys should be sorted as strings: "1", "10", "2"
            expect(result).toBe('{"1":"one","10":"ten","2":"two"}');
        });
    });

    describe('JSON validity', () => {
        test('output is always valid JSON for valid inputs', () => {
            const testCases = [
                { a: 1, b: 2 },
                [1, 2, 3],
                'string',
                42,
                true,
                null,
                { nested: { deeply: { value: 'test' } } },
                [{ a: 1 }, { b: 2 }],
                { arr: [1, 2, { c: 3 }] }
            ];

            testCases.forEach(testCase => {
                const result = stableStringify(testCase);
                expect(() => JSON.parse(result)).not.toThrow();
            });
        });

        test('parsed output equals original structure', () => {
            const obj = {
                z: 3,
                a: 1,
                nested: {
                    y: 2,
                    x: 1
                },
                arr: [3, 2, 1]
            };

            const result = stableStringify(obj);
            const parsed = JSON.parse(result);

            expect(parsed).toEqual(obj);
        });
    });

    describe('stability comparison', () => {
        test('produces same hash for equivalent objects', () => {
            const obj1 = { b: 2, a: 1, c: { z: 26, y: 25 } };
            const obj2 = { c: { y: 25, z: 26 }, a: 1, b: 2 };

            expect(stableStringify(obj1)).toBe(stableStringify(obj2));
        });

        test('produces different output for different objects', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { a: 1, b: 3 };

            expect(stableStringify(obj1)).not.toBe(stableStringify(obj2));
        });
    });
});
