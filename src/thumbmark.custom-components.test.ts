import { Thumbmark } from './thumbmark';
import { customComponents } from './factory';
import { getThumbmark, includeComponent as includeGlobalComponent } from './index';

describe('Thumbmark custom components', () => {
    beforeEach(() => {
        for (const key of Object.keys(customComponents)) {
            delete customComponents[key];
        }
    });

    test('custom components stay scoped to the instance that registered them', async () => {
        const tm1 = new Thumbmark({ logging: false });
        const tm2 = new Thumbmark({ logging: false });

        tm1.includeComponent('instanceOnly', async () => ({
            value: 'tm1'
        }));

        const tm1Result = await tm1.get({ include: ['instanceOnly'] });
        const tm2Result = await tm2.get({ include: ['instanceOnly'] });

        expect(tm1Result.components.instanceOnly).toEqual({ value: 'tm1' });
        expect(tm2Result.components.instanceOnly).toBeUndefined();
    });

    test('deprecated global includeComponent still registers components for getThumbmark', async () => {
        includeGlobalComponent('legacyGlobal', async () => ({
            value: 'global'
        }));

        const result = await getThumbmark({
            logging: false,
            include: ['legacyGlobal']
        });

        expect(result.components.legacyGlobal).toEqual({ value: 'global' });
    });

    test('getThumbmark accepts an optional custom component registry', async () => {
        const result = await getThumbmark({
            logging: false,
            include: ['directCustom']
        }, {
            directCustom: async () => ({
                value: 'direct'
            })
        });

        expect(result.components.directCustom).toEqual({ value: 'direct' });
    });

    test('deprecated global includeComponent still registers components for Thumbmark.get()', async () => {
        includeGlobalComponent('legacyGlobal', async () => ({
            value: 'global'
        }));

        const tm = new Thumbmark({ logging: false });
        const result = await tm.get({
            include: ['legacyGlobal']
        });

        expect(result.components.legacyGlobal).toEqual({ value: 'global' });
    });

    test('instance custom components override deprecated global ones for the same key', async () => {
        includeGlobalComponent('sharedKey', async () => ({
            value: 'global'
        }));

        const tm = new Thumbmark({ logging: false });
        tm.includeComponent('sharedKey', async () => ({
            value: 'instance'
        }));

        const globalResult = await getThumbmark({
            logging: false,
            include: ['sharedKey']
        });
        const instanceResult = await tm.get({
            include: ['sharedKey']
        });

        expect(globalResult.components.sharedKey).toEqual({ value: 'global' });
        expect(instanceResult.components.sharedKey).toEqual({ value: 'instance' });
    });
});
