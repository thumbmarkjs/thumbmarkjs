import { getExperimentalPayload, EXPERIMENTAL_PAYLOAD_URL } from './experimental';

const VALID_ARTIFACT = `(function () {
  'use strict';
  const schema = 1;
  const payload_id = "20260817T085408Z-5b50de2";
  return Promise.resolve({ schema: schema, payload_id: payload_id, signals: { seedTrivial: true } });
})()`;

// Written out as literals rather than imported, so these tests pin the contract
// the backend reads instead of tautologically restating the source.
const NO_PAYLOAD = { schema: 0, payload_id: 'none', signals: {} };

function mockResponse(body: string, ok = true, status = 200) {
    return {
        ok,
        status,
        text: () => Promise.resolve(body),
    } as unknown as Response;
}

describe('getExperimentalPayload', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('fetches the payload from the published artifact URL', async () => {
        fetchMock.mockResolvedValue(mockResponse(VALID_ARTIFACT));

        await getExperimentalPayload();

        expect(fetchMock).toHaveBeenCalledWith(EXPERIMENTAL_PAYLOAD_URL, { method: 'GET' });
    });

    describe('a healthy payload', () => {
        test('returns the whole envelope when the artifact resolves to a promise', async () => {
            fetchMock.mockResolvedValue(mockResponse(VALID_ARTIFACT));

            expect(await getExperimentalPayload()).toEqual({
                schema: 1,
                payload_id: '20260817T085408Z-5b50de2',
                signals: { seedTrivial: true },
                errors: [],
            });
        });

        test('returns the envelope when the artifact resolves synchronously', async () => {
            fetchMock.mockResolvedValue(mockResponse(
                `({ schema: 2, payload_id: "abc", signals: { a: 1 } })`
            ));

            expect(await getExperimentalPayload()).toEqual({
                schema: 2, payload_id: 'abc', signals: { a: 1 }, errors: [],
            });
        });

        test('passes signal errors through untouched', async () => {
            // No published artifact emits these yet. When one does, an already
            // shipped library must carry them rather than drop them.
            fetchMock.mockResolvedValue(mockResponse(`({
                schema: 1, payload_id: "abc", signals: { a: 1 },
                errors: [
                    { target: "signal", type: "timeout", signal: "slowOne" },
                    { target: "signal", type: "threw", signal: "brokenOne", message: "boom" }
                ]
            })`));

            expect((await getExperimentalPayload()).errors).toEqual([
                { target: 'signal', type: 'timeout', signal: 'slowOne' },
                { target: 'signal', type: 'threw', signal: 'brokenOne', message: 'boom' },
            ]);
        });

        test('preserves top-level fields this version does not know about', async () => {
            // The point of the architecture is shipping payload changes without
            // a library release, so unknown fields must survive.
            fetchMock.mockResolvedValue(mockResponse(
                `({ schema: 1, payload_id: "abc", signals: {}, futureField: "kept" })`
            ));

            expect(await getExperimentalPayload()).toEqual({
                schema: 1, payload_id: 'abc', signals: {}, errors: [], futureField: 'kept',
            });
        });

        test('normalizes a non-array errors field to an empty array', async () => {
            fetchMock.mockResolvedValue(mockResponse(
                `({ schema: 1, payload_id: "abc", signals: {}, errors: "nonsense" })`
            ));

            expect((await getExperimentalPayload()).errors).toEqual([]);
        });
    });

    describe('request failures', () => {
        test.each([
            ['a network error or blocked connect-src', () =>
                fetchMock.mockRejectedValue(new TypeError('Failed to fetch')), 'fetch'],
            ['a non-2xx response', () =>
                fetchMock.mockResolvedValue(mockResponse('', false, 503)), 'http'],
            ['an empty body', () =>
                fetchMock.mockResolvedValue(mockResponse('')), 'empty'],
            ['an oversized body', () =>
                fetchMock.mockResolvedValue(mockResponse('/*'.padEnd(200000, 'x'))), 'oversized'],
            ['a syntax error', () =>
                fetchMock.mockResolvedValue(mockResponse('(function () { this is not javascript')), 'syntax'],
            ['an artifact that throws', () =>
                fetchMock.mockResolvedValue(mockResponse('(function () { throw new Error("boom"); })()')), 'threw'],
            ['an artifact that rejects', () =>
                fetchMock.mockResolvedValue(mockResponse('Promise.reject(new Error("boom"))')), 'threw'],
            ['a CSP forbidding unsafe-eval', () =>
                fetchMock.mockResolvedValue(mockResponse('(function () { throw new EvalError("blocked by CSP"); })()')), 'eval_blocked'],
        ])('reports type %s as "%s"', async (_label, arrange, expectedType) => {
            arrange();

            const result = await getExperimentalPayload();

            expect(result).toMatchObject(NO_PAYLOAD);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toMatchObject({ target: 'request', type: expectedType });
        });

        test('carries the status on an http error', async () => {
            fetchMock.mockResolvedValue(mockResponse('', false, 503));

            expect((await getExperimentalPayload()).errors[0].message).toBe('HTTP 503');
        });

        test('truncates a long error message', async () => {
            fetchMock.mockRejectedValue(new TypeError('x'.repeat(5000)));

            expect((await getExperimentalPayload()).errors[0].message).toHaveLength(200);
        });

        test('omits message when there is no detail worth carrying', async () => {
            fetchMock.mockResolvedValue(mockResponse(''));

            expect((await getExperimentalPayload()).errors[0]).not.toHaveProperty('message');
        });

        test('leaves no timer pending once the payload resolves', async () => {
            // This runs on someone else's page; an uncleared timer holds its
            // closure for the full timeout on every call.
            jest.useFakeTimers();
            fetchMock.mockResolvedValue(mockResponse(VALID_ARTIFACT));

            await getExperimentalPayload();

            expect(jest.getTimerCount()).toBe(0);
            jest.useRealTimers();
        });

        test('times out rather than hanging', async () => {
            jest.useFakeTimers();
            fetchMock.mockReturnValue(new Promise(() => { /* never settles */ }));

            const pending = getExperimentalPayload();
            jest.advanceTimersByTime(2000);
            const result = await pending;

            expect(result).toMatchObject(NO_PAYLOAD);
            expect(result.errors[0]).toMatchObject({ target: 'request', type: 'timeout' });
            jest.useRealTimers();
        });
    });

    describe('malformed envelopes', () => {
        test.each([
            ['a missing payload_id', '({ schema: 1, signals: {} })'],
            ['a non-numeric schema', '({ schema: "1", payload_id: "a", signals: {} })'],
            ['a missing signals object', '({ schema: 1, payload_id: "a" })'],
            ['an array for signals', '({ schema: 1, payload_id: "a", signals: [] })'],
            ['a bare value', '42'],
            ['null', 'null'],
            ['an array', '[1, 2, 3]'],
            // schema 0 is the failure marker; a real artifact may never claim it.
            ['a reserved schema of 0', '({ schema: 0, payload_id: "a", signals: {} })'],
            ['a negative schema', '({ schema: -1, payload_id: "a", signals: {} })'],
        ])('rejects an envelope with %s', async (_label, artifact) => {
            fetchMock.mockResolvedValue(mockResponse(artifact));

            const result = await getExperimentalPayload();

            expect(result).toMatchObject(NO_PAYLOAD);
            expect(result.errors[0]).toMatchObject({ target: 'request', type: 'malformed' });
        });

        test('rejects an envelope built on a polluted prototype', async () => {
            fetchMock.mockResolvedValue(mockResponse(
                `Object.assign(Object.create({ polluted: true }), { schema: 1, payload_id: "a", signals: {} })`
            ));

            expect((await getExperimentalPayload()).errors[0]).toMatchObject({ type: 'malformed' });
        });
    });

    test('does not evaluate in this module\'s scope', async () => {
        // Indirect eval means the payload sees global scope only. A payload
        // referencing a module-local binding must fail, not capture it.
        fetchMock.mockResolvedValue(mockResponse('({ schema: 1, payload_id: VALID_ARTIFACT, signals: {} })'));

        expect(await getExperimentalPayload()).toMatchObject(NO_PAYLOAD);
    });

    test('hands out a fresh envelope each call, never a shared object', async () => {
        // The envelope reaches both the log payload and the caller's response;
        // if those were the same object, a caller mutating one would alter the
        // other.
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        const first = await getExperimentalPayload();
        const second = await getExperimentalPayload();

        expect(first).not.toBe(second);
        expect(first.errors).not.toBe(second.errors);
        first.schema = 99;
        first.errors.push({ target: 'request', type: 'injected' });
        expect(second).toMatchObject(NO_PAYLOAD);
        expect(second.errors).toHaveLength(1);
    });
});
