/**
 * Tests for Thumbmark class behavior in Node/Jest environment
 *
 * These tests verify that Thumbmark works gracefully when browser APIs
 * are not available (e.g., in Jest/jsdom or server-side environments).
 */

import { Thumbmark } from './thumbmark';
import { jest } from '@jest/globals';

// Polyfill for sessionStorage in Node environment
if (typeof sessionStorage === 'undefined') {
    (global as any).sessionStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
    };
}


describe('Thumbmark in Node/Jest environment', () => {
    test('Thumbmark.get() should not throw in non-browser environment', async () => {
        const tm = new Thumbmark();

        // This should not throw, even if browser APIs are unavailable
        const result = await tm.get();

        // Should return a valid result with structure
        expect(result).toBeDefined();
        expect(result.thumbmark).toBeDefined();
        expect(typeof result.thumbmark).toBe('string');
    });

    test('Thumbmark.get() returns valid structure even with missing browser APIs', async () => {
        const tm = new Thumbmark();

        const result = await tm.get();

        // Verify the response structure
        expect(result).toHaveProperty('thumbmark');
        expect(result).toHaveProperty('components');
        expect(result).toHaveProperty('version');
        expect(result).toHaveProperty('info');

        // Components should be an object (possibly with fewer values than in real browser)
        expect(typeof result.components).toBe('object');
    });

    test('Thumbmark.getVersion() works in any environment', () => {
        const tm = new Thumbmark();
        const version = tm.getVersion();

        expect(version).toBeDefined();
        expect(typeof version).toBe('string');
    });
});
