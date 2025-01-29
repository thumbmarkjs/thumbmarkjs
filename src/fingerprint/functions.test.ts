import {componentInterface} from '../factory'
import {filterFingerprintData} from './functions'

const test_components: componentInterface = {
    'one': '1',
    'two': 2,
    'three': {'a': true, 'b': false}
}

describe('component filtering tests', () => {
    test("excluding top level works", () => {
        expect(filterFingerprintData(test_components, ['one'], [])).toMatchObject({
            'two': 2, 'three': {'a': true, 'b': false}
        })
    });
    test("including top level works", () => {
        expect(filterFingerprintData(test_components, [], ['one', 'two'])).toMatchObject({
            'one': '1', 'two': 2
        })
    });
    test("excluding low-level works", () => {
        expect(filterFingerprintData(test_components, ['two', 'three.a'], [])).toMatchObject({
            'one': '1',
            'three': {'b': false}
        })
    });
    test("including low-level works", () => {
        expect(filterFingerprintData(test_components, [], ['one', 'three.b'])).toMatchObject({
            'one': '1',
            'three': {'b': false}
        })
    });

});