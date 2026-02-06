import { getApiPromise, apiResponse } from './api';
import { OptionsAfterDefaults } from '../options';
import { componentInterface } from '../factory';

// Mock fetch globally
global.fetch = jest.fn();

describe('Metadata Support', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                thumbmark: 'test-thumbmark',
                visitorId: 'test-visitor',
                requestId: 'test-request',
                metadata: 'test-metadata',
            }),
        });
        // Spy on console.error
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should include static metadata string in request body', async () => {
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: 'event-123',
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.metadata).toBe('event-123');
    });

    it('should evaluate metadata function and include result in request body', async () => {
        let counter = 0;
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: () => `call-${++counter}`,
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.metadata).toBe('call-1');
    });

    it('should call metadata function each time get is invoked', async () => {
        let counter = 0;
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: () => `call-${++counter}`,
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        // First call
        await getApiPromise(options as OptionsAfterDefaults, components);
        const firstCallArgs = (global.fetch as jest.Mock).mock.calls[0];
        const firstRequestBody = JSON.parse(firstCallArgs[1].body);
        expect(firstRequestBody.metadata).toBe('call-1');

        // Second call
        await getApiPromise(options as OptionsAfterDefaults, components);
        const secondCallArgs = (global.fetch as jest.Mock).mock.calls[1];
        const secondRequestBody = JSON.parse(secondCallArgs[1].body);
        expect(secondRequestBody.metadata).toBe('call-2');
    });

    it('should omit metadata from request body when not provided', async () => {
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.metadata).toBeUndefined();
    });

    it('should echo metadata back in API response', async () => {
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: '{"eventId": "12345"}',
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        const response = await getApiPromise(options as OptionsAfterDefaults, components);

        expect(response).toBeDefined();
        expect(response?.metadata).toBe('test-metadata');
    });

    it('should handle various string metadata types', async () => {
        const testCases = [
            'simple-string',
            '{"json": "object"}',
            'encrypted:abc123def456',
            'multi\nline\nstring',
            '🎉 unicode 中文',
        ];

        for (const metadata of testCases) {
            const options: Partial<OptionsAfterDefaults> = {
                api_key: 'test-key',
                metadata,
                cache_api_call: false,
            };
            const components: componentInterface = { system: { browser: 'chrome' } };

            await getApiPromise(options as OptionsAfterDefaults, components);

            const callArgs = (global.fetch as jest.Mock).mock.calls[
                (global.fetch as jest.Mock).mock.calls.length - 1
            ];
            const requestBody = JSON.parse(callArgs[1].body);
            expect(requestBody.metadata).toBe(metadata);
        }
    });

    it('should handle empty string metadata', async () => {
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: '',
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        // Empty string is falsy, so it won't be included
        expect(requestBody.metadata).toBeUndefined();
    });

    it('should handle metadata function returning empty string', async () => {
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: () => '',
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        // Empty string is falsy, so it won't be included
        expect(requestBody.metadata).toBeUndefined();
    });

    it('should log error and omit metadata if length exceeds 1000 characters', async () => {
        const longMetadata = 'a'.repeat(1001);
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: longMetadata,
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        // Check that fetch was called
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // precise console error check
        expect(console.error).toHaveBeenCalledWith('ThumbmarkJS: Metadata exceeds 1000 characters. Skipping metadata.');

        // Check that metadata was omitted
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.metadata).toBeUndefined();
    });

    it('should accept metadata exactly 1000 characters check', async () => {
        const validMetadata = 'a'.repeat(1000);
        const options: Partial<OptionsAfterDefaults> = {
            api_key: 'test-key',
            metadata: validMetadata,
            cache_api_call: false,
        };
        const components: componentInterface = { system: { browser: 'chrome' } };

        await getApiPromise(options as OptionsAfterDefaults, components);

        expect(console.error).not.toHaveBeenCalledWith('ThumbmarkJS: Metadata exceeds 1000 characters. Skipping metadata.');

        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.metadata).toBe(validMetadata);
    });
});
