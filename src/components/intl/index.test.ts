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
    expect(result).toHaveProperty('hash');
    expect(result).toHaveProperty('details');
    expect(typeof result!.hash).toBe('string');
    const details = result!.details as Record<string, unknown>;
    const coreKeys = [
      'dateFullFormat', 'dateMediumFormat', 'timeFormat',
      'numberFormat', 'currencyFormat', 'percentFormat',
      'nonLatinDate', 'nonLatinNumber',
    ];
    for (const key of coreKeys) {
      expect(details).toHaveProperty(key);
      expect(typeof details[key]).toBe('string');
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
    const details = result!.details as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(details).toHaveProperty('dateFullFormat');
    expect(details).not.toHaveProperty('listFormat');
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
    const details = result!.details as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(details).toHaveProperty('dateFullFormat');
    expect(details).not.toHaveProperty('displayNames');
  });

  test('includes guarded probes when available', async () => {
    const result = await getIntl();
    const details = result!.details as Record<string, unknown>;

    expect(result).not.toBeNull();
    if (typeof (Intl as any).ListFormat === 'function') {
      expect(details).toHaveProperty('listFormat');
      expect(typeof details.listFormat).toBe('string');
    }
    if (typeof (Intl as any).DisplayNames === 'function') {
      expect(details).toHaveProperty('displayNames');
      expect(typeof details.displayNames).toBe('string');
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
    const details = result!.details as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(details.numberFormat).toBe('123,456.789');
    expect(details.currencyFormat).toBe('$123,456.79');
    expect(details.percentFormat).toBe('46%');
  });
});
