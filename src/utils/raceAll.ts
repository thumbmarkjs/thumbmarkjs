type DelayedPromise<T> = Promise<T>;

export function delay<T>(t: number, val: T): DelayedPromise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(val), t);
  });
}


export interface RaceResult<T> {
  value: T;
  elapsed?: number;
  error?: string;
}

export function raceAllPerformance<T>(
  promises: Promise<T>[],
  timeoutTime: number,
  timeoutVal: T
): Promise<RaceResult<T>[]> {
  return Promise.all(
    promises.map((p) => {
      const startTime = performance.now();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const resultPromise = p.then((value) => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        return { value, elapsed: performance.now() - startTime };
      }).catch((err: unknown) => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        return {
          value: timeoutVal,
          elapsed: performance.now() - startTime,
          error: err instanceof Error ? err.message : String(err),
        };
      });

      const timeoutPromise = new Promise<RaceResult<T>>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            value: timeoutVal,
            elapsed: performance.now() - startTime,
            error: 'timeout',
          });
        }, timeoutTime);
      });

      return Promise.race([resultPromise, timeoutPromise]);
    })
  );
}



export function raceAll<T>(promises: Promise<T>[], timeoutTime: number, timeoutVal: T): Promise<(T | undefined)[]> {
  return Promise.all(promises.map((p) => {
    return Promise.race([p.catch(() => timeoutVal), delay(timeoutTime, timeoutVal)]);
  }));
}
