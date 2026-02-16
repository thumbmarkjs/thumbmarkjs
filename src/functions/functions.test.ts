import { componentInterface } from '../factory'
import { filterThumbmarkData } from './filterComponents'
import { resolveClientComponents, getThumbmark } from '.';
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

        const { resolvedComponents, elapsed, errors } = await resolveClientComponents(components, {
            ...defaultOptions,
            stabilize: [],
        });

        expect(resolvedComponents.stable).toEqual({ value: 'ok' });
        expect(resolvedComponents.unstable).toEqual({ timeout: 'true' });
        expect(elapsed.stable).toBeGreaterThanOrEqual(0);
        expect(elapsed.unstable).toBeGreaterThanOrEqual(0);
        expect(errors).toEqual([
            { type: 'component_error', message: 'component failed', component: 'unstable' }
        ]);
    });

    test('reports component timeout in errors', async () => {
        const components = {
            fast: async () => ({ value: 'ok' } as componentInterface),
            slow: () => new Promise<componentInterface>(() => {}),
        };

        const { resolvedComponents, errors } = await resolveClientComponents(components, {
            ...defaultOptions,
            timeout: 10,
            stabilize: [],
        });

        expect(resolvedComponents.fast).toEqual({ value: 'ok' });
        expect(errors).toEqual([
            { type: 'component_timeout', message: "Component 'slow' timed out", component: 'slow' }
        ]);
    });

    test('returns empty errors when all components succeed', async () => {
        const components = {
            a: async () => ({ value: '1' } as componentInterface),
            b: async () => ({ value: '2' } as componentInterface),
        };

        const { errors } = await resolveClientComponents(components, {
            ...defaultOptions,
            stabilize: [],
        });

        expect(errors).toEqual([]);
    });
});

describe('getThumbmark error reporting', () => {
    test('returns api_unauthorized error for 403 response', async () => {
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 403,
        });

        const result = await getThumbmark({
            ...defaultOptions,
            api_key: 'fake-invalid-key',
            cache_api_call: false,
        });

        expect(result.error).toEqual([
            { type: 'api_unauthorized', message: 'Invalid API key or quota exceeded' }
        ]);
        expect(result.thumbmark).toBe('');

        global.fetch = originalFetch;
    });

    test('returns api_error for 5xx response', async () => {
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        const result = await getThumbmark({
            ...defaultOptions,
            api_key: 'some-key',
            cache_api_call: false,
        });

        expect(result.error).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'api_error', message: 'HTTP error! status: 500' })
            ])
        );
        // Should still return a fingerprint (graceful degradation)
        expect(result.thumbmark).toBeDefined();
        expect(result.thumbmark.length).toBeGreaterThan(0);

        global.fetch = originalFetch;
    });
});
