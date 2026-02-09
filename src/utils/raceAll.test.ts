import { raceAllPerformance } from './raceAll';

describe('raceAllPerformance', () => {
    test('returns resolved values when promises fulfill', async () => {
        const results = await raceAllPerformance(
            [Promise.resolve('ok')],
            50,
            'timeout'
        );

        expect(results).toHaveLength(1);
        expect(results[0].value).toBe('ok');
        expect(typeof results[0].elapsed).toBe('number');
    });

    test('returns timeout fallback when promise does not settle in time', async () => {
        const neverResolves = new Promise<string>(() => { });
        const results = await raceAllPerformance(
            [neverResolves],
            10,
            'timeout'
        );

        expect(results).toHaveLength(1);
        expect(results[0].value).toBe('timeout');
    });

    test('does not reject the whole batch when one promise rejects', async () => {
        const rejects = Promise.reject(new Error('component failed'));
        const resolves = Promise.resolve('ok');

        const results = await raceAllPerformance(
            [rejects, resolves],
            50,
            'timeout'
        );

        expect(results).toHaveLength(2);
        expect(results[0].value).toBe('timeout');
        expect(results[1].value).toBe('ok');
    });
});
