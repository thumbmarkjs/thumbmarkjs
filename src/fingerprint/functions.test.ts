import { componentInterface } from '../factory'
import { filterThumbmarkData } from '../utils/filterComponents'
import { defaultOptions } from './options';

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