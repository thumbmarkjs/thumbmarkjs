import { logThumbmarkData } from './log';
import { defaultOptions } from '../options';

const VALID_ARTIFACT = `({ schema: 1, payload_id: "20260817T085408Z-5b50de2", signals: { seedTrivial: true } })`;

describe('logThumbmarkData', () => {
    let fetchMock: jest.Mock;

    /** Resolves the payload fetch with `artifact`, and the log POST with 200. */
    function arrangeFetch(artifact: string | Error) {
        fetchMock.mockImplementation((url: string) => {
            if (url.includes('experimental.thumbmarkjs.com')) {
                return artifact instanceof Error
                    ? Promise.reject(artifact)
                    : Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(artifact) });
            }
            return Promise.resolve({ ok: true, status: 200 });
        });
    }

    function loggedPayload() {
        const call = fetchMock.mock.calls.find(([url]) => url.includes('/log'));
        return JSON.parse(call![1].body);
    }

    beforeEach(() => {
        sessionStorage.clear();
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    test('carries the evaluated payload under the experimental key', async () => {
        arrangeFetch(VALID_ARTIFACT);

        await logThumbmarkData('abc123', { screen: { width: 100 } }, defaultOptions);

        expect(loggedPayload().experimental).toEqual({
            schema: 1,
            payload_id: '20260817T085408Z-5b50de2',
            signals: { seedTrivial: true },
            errors: [],
        });
    });

    test('still logs, carrying the reason, when the payload cannot be fetched', async () => {
        // The fingerprint is the point of the log; a dead payload must not cost us the record.
        arrangeFetch(new TypeError('Failed to fetch'));

        await logThumbmarkData('abc123', { screen: { width: 100 } }, defaultOptions);

        const payload = loggedPayload();
        expect(payload.thumbmark).toBe('abc123');
        expect(payload.experimental).toMatchObject({ schema: 0, payload_id: 'none', signals: {} });
        expect(payload.experimental.errors[0]).toMatchObject({ target: 'request', type: 'fetch' });
    });

    test('marks the session before doing any network work', async () => {
        // Set up front, so a concurrent getThumbmark cannot start a second log
        // while this one is still awaiting the payload.
        let markedDuringFetch: string | null = null;
        fetchMock.mockImplementation((url: string) => {
            if (url.includes('experimental.thumbmarkjs.com')) {
                markedDuringFetch = sessionStorage.getItem('_tmjs_l');
                return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(VALID_ARTIFACT) });
            }
            return Promise.resolve({ ok: true, status: 200 });
        });

        await logThumbmarkData('abc123', {}, defaultOptions);

        expect(markedDuringFetch).toBe('1');
    });

    test('never rejects when the log endpoint is down', async () => {
        fetchMock.mockImplementation((url: string) =>
            url.includes('experimental.thumbmarkjs.com')
                ? Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(VALID_ARTIFACT) })
                : Promise.reject(new TypeError('Failed to fetch')));

        await expect(logThumbmarkData('abc123', {}, defaultOptions)).resolves.toBeUndefined();
    });

    test('posts errors only when there are some', async () => {
        arrangeFetch(VALID_ARTIFACT);

        await logThumbmarkData('abc123', {}, defaultOptions);
        expect(loggedPayload()).not.toHaveProperty('errors');

        fetchMock.mockClear();
        await logThumbmarkData('abc123', {}, defaultOptions, [
            { type: 'component_timeout', message: "Component 'audio' timed out", component: 'audio' },
        ]);
        expect(loggedPayload().errors).toHaveLength(1);
    });
});
