import { DEFAULT_STORAGE_PREFIX, defaultOptions } from "./options";

describe('property_name_factory', () => {
    test('it should default to the default value', () => {
        const name = 'mykey';
        expect(
            defaultOptions.property_name_factory(name)
        ).toEqual(`${DEFAULT_STORAGE_PREFIX}_${name}`);
    })
})