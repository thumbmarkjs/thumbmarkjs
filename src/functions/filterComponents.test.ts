import { getExcludeList, filterThumbmarkData } from './filterComponents';
import { defaultOptions } from '../options';
import { componentInterface } from '../factory';

// Mock getBrowser so we can control browser detection in tests
jest.mock('../components/system/browser', () => ({
    getBrowser: jest.fn(() => ({ name: 'unknown', version: 'unknown' })),
}));

import { getBrowser } from '../components/system/browser';
const mockGetBrowser = getBrowser as jest.Mock;

const testData: componentInterface = {
    one: '1',
    two: 2,
    three: { a: true, b: false },
    speech: { hash: 'abc' },
    canvas: { hash: 'def' },
    audio: { sampleHash: 'ghi', other: 'jkl' },
};

// ── getExcludeList ──────────────────────────────────────────────

describe('getExcludeList', () => {
    beforeEach(() => {
        mockGetBrowser.mockReturnValue({ name: 'unknown', version: 'unknown' });
    });

    test('returns empty when no options and unknown browser', () => {
        expect(getExcludeList()).toEqual([]);
    });

    test('returns user exclude list as-is', () => {
        const result = getExcludeList({ ...defaultOptions, exclude: ['one', 'two'] });
        expect(result).toContain('one');
        expect(result).toContain('two');
    });

    test("'always' rules apply even with empty stabilize", () => {
        mockGetBrowser.mockReturnValue({ name: 'Firefox', version: '130.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: [] });
        expect(result).toContain('speech');
    });

    test("'always' rules don't apply when browser doesn't match", () => {
        mockGetBrowser.mockReturnValue({ name: 'Chrome', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: [] });
        expect(result).not.toContain('speech');
    });

    test('stabilization rules expand for matching browser', () => {
        mockGetBrowser.mockReturnValue({ name: 'Firefox', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: ['private'] });
        expect(result).toContain('canvas');
        expect(result).toContain('fonts');
        expect(result).toContain('tls.extensions');
    });

    test('stabilization rules do not apply for non-matching browser', () => {
        mockGetBrowser.mockReturnValue({ name: 'Chrome', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: ['private'] });
        expect(result).not.toContain('canvas');
        expect(result).not.toContain('fonts');
        // Chrome does get some rules though
        expect(result).toContain('header.acceptLanguage');
        expect(result).toContain('tls.extensions');
    });

    test('version matching with >= syntax', () => {
        // safari>=17 should match Safari 18
        mockGetBrowser.mockReturnValue({ name: 'Safari', version: '18.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: ['private'] });
        expect(result).toContain('canvas');

        // safari>=17 should match Safari 17
        mockGetBrowser.mockReturnValue({ name: 'Safari', version: '17.0' });
        const result17 = getExcludeList({ ...defaultOptions, stabilize: ['private'] });
        expect(result17).toContain('canvas');

        // safari>=17 should NOT match Safari 16
        mockGetBrowser.mockReturnValue({ name: 'Safari', version: '16.5' });
        const result16 = getExcludeList({ ...defaultOptions, stabilize: ['private'] });
        expect(result16).not.toContain('canvas');
    });

    test('browser-independent rules always apply', () => {
        // 'iframe' has { exclude: ['permissions'] } with no browsers key
        mockGetBrowser.mockReturnValue({ name: 'Chrome', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: ['iframe'] });
        expect(result).toContain('permissions');
    });

    test('vpn stabilization excludes ip for any browser', () => {
        mockGetBrowser.mockReturnValue({ name: 'Chrome', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: ['vpn'] });
        expect(result).toContain('ip');
    });

    test('multiple stabilization options combine', () => {
        mockGetBrowser.mockReturnValue({ name: 'Firefox', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, stabilize: ['private', 'vpn'] });
        expect(result).toContain('canvas');  // from private+firefox
        expect(result).toContain('ip');      // from vpn
        expect(result).toContain('speech');  // from always+firefox
    });

    test('user exclude list is combined with stabilization rules', () => {
        mockGetBrowser.mockReturnValue({ name: 'Firefox', version: '120.0' });
        const result = getExcludeList({ ...defaultOptions, exclude: ['custom'], stabilize: ['private'] });
        expect(result).toContain('custom');  // user's
        expect(result).toContain('canvas');  // from rules
    });

    test('unknown stabilization option is silently skipped', () => {
        const result = getExcludeList({ ...defaultOptions, stabilize: ['nonexistent' as any] });
        // Should not throw, just return whatever 'always' contributes (nothing for unknown browser)
        expect(Array.isArray(result)).toBe(true);
    });

    test('browser fallback from component data (server-side)', () => {
        // getBrowser returns unknown (simulating server-side)
        mockGetBrowser.mockReturnValue({ name: 'unknown', version: 'unknown' });

        const obj: componentInterface = {
            system: {
                browser: {
                    name: 'Brave',
                    version: '130.0',
                },
            },
        };

        const result = getExcludeList({ ...defaultOptions, stabilize: ['private'] }, obj);
        // Brave-specific rules should apply via fallback
        expect(result).toContain('canvas');
        expect(result).toContain('plugins');
        expect(result).toContain('speech');  // from 'always'
    });

    test('browser fallback is skipped when getBrowser succeeds', () => {
        mockGetBrowser.mockReturnValue({ name: 'Chrome', version: '120.0' });

        const obj: componentInterface = {
            system: {
                browser: {
                    name: 'Firefox',
                    version: '120.0',
                },
            },
        };

        const result = getExcludeList({ ...defaultOptions, stabilize: ['private'] }, obj);
        // Should use Chrome rules (from getBrowser), not Firefox (from obj)
        expect(result).toContain('header.acceptLanguage');  // Chrome rule
        expect(result).not.toContain('fonts');               // Firefox-only rule
    });

    test('browser fallback handles missing system gracefully', () => {
        mockGetBrowser.mockReturnValue({ name: 'unknown', version: 'unknown' });
        const obj: componentInterface = { one: '1' };
        // Should not throw
        expect(() => getExcludeList({ ...defaultOptions }, obj)).not.toThrow();
    });
});

// ── filterThumbmarkData ─────────────────────────────────────────

describe('filterThumbmarkData', () => {
    beforeEach(() => {
        mockGetBrowser.mockReturnValue({ name: 'unknown', version: 'unknown' });
    });

    test('returns full object with no options', () => {
        const result = filterThumbmarkData(testData);
        expect(result).toEqual(testData);
    });

    test('returns full object with empty exclude', () => {
        const result = filterThumbmarkData(testData, { ...defaultOptions, exclude: [], stabilize: [] });
        expect(result).toEqual(testData);
    });

    test('include overrides exclude for the same key', () => {
        const result = filterThumbmarkData(testData, {
            ...defaultOptions,
            exclude: ['one'],
            include: ['one'],
            stabilize: [],
        });
        expect(result.one).toBe('1');
    });

    test('include overrides exclude at nested level', () => {
        const result = filterThumbmarkData(testData, {
            ...defaultOptions,
            exclude: ['three'],
            include: ['three.a'],
            stabilize: [],
        });
        expect(result.three).toEqual({ a: true });
        expect((result.three as componentInterface).b).toBeUndefined();
    });

    test('excluding a parent removes all children', () => {
        const result = filterThumbmarkData(testData, {
            ...defaultOptions,
            exclude: ['three'],
            stabilize: [],
        });
        expect(result.three).toBeUndefined();
    });

    test('stabilization rules integrate with filterThumbmarkData', () => {
        mockGetBrowser.mockReturnValue({ name: 'Brave', version: '130.0' });
        const result = filterThumbmarkData(testData, {
            ...defaultOptions,
            stabilize: ['private'],
        });
        // Brave+private excludes canvas
        expect(result.canvas).toBeUndefined();
        // Brave+'always' excludes speech
        expect(result.speech).toBeUndefined();
        // Others remain
        expect(result.one).toBe('1');
    });

    test('nested exclusion via stabilization rules', () => {
        mockGetBrowser.mockReturnValue({ name: 'Brave', version: '130.0' });
        const result = filterThumbmarkData(testData, {
            ...defaultOptions,
            stabilize: ['private'],
        });
        // audio.sampleHash excluded for Brave, but audio.other should remain
        expect(result.audio).toBeDefined();
        expect((result.audio as componentInterface).other).toBe('jkl');
        expect((result.audio as componentInterface).sampleHash).toBeUndefined();
    });
});
