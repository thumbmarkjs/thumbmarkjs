type DelayedPromise<T> = Promise<T>;

export function delay<T>(t: number, val: T): DelayedPromise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(val), t);
  });
}


export interface RaceResult<T> {
  value: T;
  elapsed?: number;
}

export function raceAllPerformance<T>(
  promises: Promise<T>[],
  timeoutTime: number,
  timeoutVal: T
): Promise<RaceResult<T>[]> {
  return Promise.all(
    promises.map((p) => {
      const startTime = performance.now();
      return Promise.race([
        p.then((value) => ({
          value,
          elapsed: performance.now() - startTime,
        })).catch(() => ({
          // Keep behavior aligned with timeout: a failed component falls back
          // to timeoutVal instead of rejecting the entire Promise.all.
          value: timeoutVal,
          elapsed: performance.now() - startTime,
        })),
        delay(timeoutTime, timeoutVal).then((value) => ({
          value,
          elapsed: performance.now() - startTime,
        })),
      ]);
    })
  );
}



export function raceAll<T>(promises: Promise<T>[], timeoutTime: number, timeoutVal: T): Promise<(T | undefined)[]> {
  return Promise.all(promises.map((p) => {
    return Promise.race([p, delay(timeoutTime, timeoutVal)]);
  }));
}
