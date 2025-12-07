import { getVisitorId, setVisitorId } from './visitorId';
import { defaultOptions, options, OptionsAfterDefaults } from '../options';

describe('visitorId storage tests', () => {
    beforeEach(() => {
        // Clear localStorage before each test to ensure isolation
        localStorage.clear();
    });

    describe('storage_property_name option', () => {
        test('should use default storage property name', () => {
            const visitorId = 'test-visitor-123';
            const options = { ...defaultOptions };

            setVisitorId(visitorId, options);

            // Verify it was stored with the default property name
            expect(localStorage.getItem('thumbmark_visitor_id')).toBe(visitorId);
            expect(getVisitorId(options)).toBe(visitorId);
        });

        test('should use custom storage property name', () => {
            const visitorId = 'custom-visitor-456';
            const customOptions: OptionsAfterDefaults = {
                ...defaultOptions,
                storage_property_name: 'my_custom_visitor_key'
            };

            setVisitorId(visitorId, customOptions);

            // Verify it was stored with the custom property name
            expect(localStorage.getItem('my_custom_visitor_key')).toBe(visitorId);
            expect(getVisitorId(customOptions)).toBe(visitorId);

            // Verify it's NOT in the default location
            expect(localStorage.getItem('thumbmark_visitor_id')).toBeNull();
        });

        test('should return null when storage property does not exist', () => {
            const options: OptionsAfterDefaults = {
                ...defaultOptions,
                storage_property_name: 'nonexistent_key'
            };

            expect(getVisitorId(options)).toBeNull();
        });

        test('should overwrite existing value for same storage property', () => {
            const oldVisitorId = 'old-visitor';
            const newVisitorId = 'new-visitor';
            const options = { ...defaultOptions };

            setVisitorId(oldVisitorId, options);
            expect(getVisitorId(options)).toBe(oldVisitorId);

            setVisitorId(newVisitorId, options);
            expect(getVisitorId(options)).toBe(newVisitorId);
        });

        test('should migrate from old value in case new prefix is set', () => {
            const visitorId = 'test-visitor-123';
            setVisitorId(visitorId, options);
            expect(getVisitorId({
                property_name_factory: (name) => `custom_prefix_${name}`,
            } as OptionsAfterDefaults)).toBe(visitorId);
            expect(localStorage.getItem(`custom_prefix_visitor_id`)).toBe(visitorId);
        })
    });

    describe('error handling', () => {
        test('should handle localStorage.getItem errors gracefully', () => {
            const options = { ...defaultOptions };

            // Mock localStorage.getItem to throw an error
            const originalGetItem = localStorage.getItem;
            localStorage.getItem = jest.fn(() => {
                throw new Error('Storage quota exceeded');
            });

            expect(getVisitorId(options)).toBeNull();

            // Restore original implementation
            localStorage.getItem = originalGetItem;
        });

        test('should handle localStorage.setItem errors gracefully', () => {
            const options = { ...defaultOptions };

            // Mock localStorage.setItem to throw an error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = jest.fn(() => {
                throw new Error('Storage quota exceeded');
            });

            // Should not throw error
            expect(() => setVisitorId('test-id', options)).not.toThrow();

            // Restore original implementation
            localStorage.setItem = originalSetItem;
        });
    });
});
