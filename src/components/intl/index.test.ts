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

  test('returns valid structure with all expected keys', async () => {
    const result = await getIntl();

    expect(result).not.toBeNull();
    const coreKeys = [
      'dateFullFormat', 'dateMediumFormat', 'timeFormat',
      'numberFormat', 'currencyFormat', 'percentFormat',
      'nonLatinDate', 'nonLatinNumber',
    ];
    for (const key of coreKeys) {
      expect(result).toHaveProperty(key);
      expect(typeof result![key]).toBe('string');
    }
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

  test('omits listFormat when ListFormat is unavailable', async () => {
    const mockIntl = Object.create(originalIntl);
    Object.defineProperty(mockIntl, 'ListFormat', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'Intl', {
      value: mockIntl,
      configurable: true,
      writable: true,
    });

    const result = await getIntl();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('dateFullFormat');
    expect(result).not.toHaveProperty('listFormat');
  });

  test('omits displayNames when DisplayNames is unavailable', async () => {
    const mockIntl = Object.create(originalIntl);
    Object.defineProperty(mockIntl, 'DisplayNames', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'Intl', {
      value: mockIntl,
      configurable: true,
      writable: true,
    });

    const result = await getIntl();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('dateFullFormat');
    expect(result).not.toHaveProperty('displayNames');
  });

  test('includes guarded probes when available', async () => {
    const result = await getIntl();

    expect(result).not.toBeNull();
    if (typeof (Intl as any).ListFormat === 'function') {
      expect(result).toHaveProperty('listFormat');
      expect(typeof result!.listFormat).toBe('string');
    }
    if (typeof (Intl as any).DisplayNames === 'function') {
      expect(result).toHaveProperty('displayNames');
      expect(typeof result!.displayNames).toBe('string');
    }
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

  test('produces deterministic number format output', async () => {
    const result = await getIntl();

    expect(result).not.toBeNull();
    expect(result!.numberFormat).toBe('123,456.789');
    expect(result!.currencyFormat).toBe('$123,456.79');
    expect(result!.percentFormat).toBe('46%');
  });
});
