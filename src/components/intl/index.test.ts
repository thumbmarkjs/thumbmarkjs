import getIntl from './index';

describe('intl component tests', () => {
  const originalIntl = globalThis.Intl;

  afterEach(() => {
    Object.defineProperty(globalThis, 'Intl', {
      value: originalIntl,
      configurable: true,
      writable: true,
    });
  });

  test('returns valid structure with only hash key', async () => {
    const result = await getIntl();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hash');
    expect(typeof result!.hash).toBe('string');
    expect(result!.hash).not.toBe('');
    expect(result).not.toHaveProperty('details');
  });

  test('returns null when Intl is unavailable', async () => {
    Object.defineProperty(globalThis, 'Intl', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const result = await getIntl();
    expect(result).toBeNull();
  });

  test('hash is stable across multiple calls', async () => {
    const result1 = await getIntl();
    const result2 = await getIntl();

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.hash).toBe(result2!.hash);
  });

  test('returns null when Intl constructor throws', async () => {
    const mockIntl = Object.create(originalIntl);
    Object.defineProperty(mockIntl, 'DateTimeFormat', {
      value: function() { throw new Error('broken'); },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'Intl', {
      value: mockIntl,
      configurable: true,
      writable: true,
    });

    const result = await getIntl();
    expect(result).toBeNull();
  });

  test('hash differs when ListFormat is unavailable vs available', async () => {
    // Capture full hash first (with ListFormat and DisplayNames active)
    const fullResult = await getIntl();
    expect(fullResult).not.toBeNull();
    const fullHash = fullResult!.hash;

    // Stub out ListFormat and DisplayNames to exercise the no-optional-apis path
    const mockIntlNoList = Object.create(originalIntl);
    Object.defineProperty(mockIntlNoList, 'ListFormat', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(mockIntlNoList, 'DisplayNames', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'Intl', {
      value: mockIntlNoList,
      configurable: true,
      writable: true,
    });

    const noListResult = await getIntl();
    expect(noListResult).not.toBeNull();
    const noListHash = noListResult!.hash;

    // Restore before asserting so afterEach is not the only cleanup
    Object.defineProperty(globalThis, 'Intl', {
      value: originalIntl,
      configurable: true,
      writable: true,
    });

    // The two hashes must differ because the serialised input differs
    expect(fullHash).not.toBe(noListHash);
    // Both hashes must be non-empty strings
    expect(fullHash).not.toBe('');
    expect(noListHash).not.toBe('');
  });

  // Pinned regression guard: hash captured from a stable jsdom run.
  // This value must only change intentionally when the Intl probe inputs
  // (locale, options, date fixture, or field set) are deliberately modified.
  test('hash matches pinned stable value', async () => {
    const result = await getIntl();
    expect(result).not.toBeNull();
    expect(result!.hash).toBe('1cc951c228a133f7d6353d798f545ba3');
  });
});
