import { componentInterface } from '../factory'
import { filterThumbmarkData } from './filterComponents'
import { resolveClientComponents } from '.';
import { defaultOptions } from '../options';

const test_components: componentInterface = {
    'one': '1',
    'two': 2,
    'three': {'a': true, 'b': false}
}

describe('component filtering tests', () => {
    test("excluding top level works", () => {
        expect(filterThumbmarkData(test_components, 
            { ...defaultOptions, ...{ exclude: ['one']} }
        )).toMatchObject({
            'two': 2, 'three': {'a': true, 'b': false}
        })
    });
    test("including top level works", () => {
        expect(filterThumbmarkData(test_components, { ...defaultOptions, ...{ include: ['one', 'two']} })).toMatchObject({
            'one': '1', 'two': 2
        })
    });
    test("excluding low-level works", () => {
        expect(filterThumbmarkData(test_components,
            { ...defaultOptions, ...{ exclude: ['two', 'three.a']} }
        )).toMatchObject({
            'one': '1',
            'three': {'b': false}
        })
    });
    test("including low-level works", () => {
        expect(filterThumbmarkData(test_components,
            { ...defaultOptions, ...{ include: ['one', 'three.b']} })).toMatchObject({
            'one': '1',
            'three': {'b': false}
        })
    });
});

describe('resolveClientComponents runtime stability', () => {
    test('continues resolving when one component promise rejects', async () => {
        const components = {
            stable: async () => ({ value: 'ok' } as componentInterface),
            unstable: async () => Promise.reject(new Error('component failed')),
        };

        const { resolvedComponents, elapsed } = await resolveClientComponents(components, {
            ...defaultOptions,
            stabilize: [],
        });

        expect(resolvedComponents.stable).toEqual({ value: 'ok' });
        expect(resolvedComponents.unstable).toEqual({ timeout: 'true' });
        expect(elapsed.stable).toBeGreaterThanOrEqual(0);
        expect(elapsed.unstable).toBeGreaterThanOrEqual(0);
    });
});
