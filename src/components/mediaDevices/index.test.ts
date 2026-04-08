import getMediaDevices from './index';

describe('mediaDevices component tests', () => {
  let originalMediaDevices: MediaDevices | undefined;

  beforeAll(() => {
    originalMediaDevices = navigator.mediaDevices;
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
  });

  function mockEnumerateDevices(devices: Array<{ kind: string }>) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: jest.fn().mockResolvedValue(devices),
      },
      configurable: true,
    });
  }

  test('returns valid structure when API is available', async () => {
    mockEnumerateDevices([
      { kind: 'audioinput' },
      { kind: 'audiooutput' },
      { kind: 'videoinput' },
    ]);

    const result = await getMediaDevices();

    expect(result).toEqual({
      audioinput: 1,
      audiooutput: 1,
      videoinput: 1,
    });
  });

  test('returns null when mediaDevices API is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });

    const result = await getMediaDevices();
    expect(result).toBeNull();
  });

  test('returns null when enumerateDevices throws', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: jest.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
      configurable: true,
    });

    const result = await getMediaDevices();
    expect(result).toBeNull();
  });

  test('handles empty device list', async () => {
    mockEnumerateDevices([]);

    const result = await getMediaDevices();

    expect(result).toEqual({
      audioinput: 0,
      audiooutput: 0,
      videoinput: 0,
    });
  });

  test('counts multiple devices of same kind', async () => {
    mockEnumerateDevices([
      { kind: 'videoinput' },
      { kind: 'videoinput' },
      { kind: 'audioinput' },
    ]);

    const result = await getMediaDevices();

    expect(result).toEqual({
      audioinput: 1,
      audiooutput: 0,
      videoinput: 2,
    });
  });

  test('ignores unknown device kind values', async () => {
    mockEnumerateDevices([
      { kind: 'audioinput' },
      { kind: '' },
      { kind: 'somethingelse' },
      { kind: 'videoinput' },
    ]);

    const result = await getMediaDevices();

    expect(result).toEqual({
      audioinput: 1,
      audiooutput: 0,
      videoinput: 1,
    });
  });

  test('returns null when enumerateDevices resolves with null', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: jest.fn().mockResolvedValue(null),
      },
      configurable: true,
    });

    const result = await getMediaDevices();
    expect(result).toBeNull();
  });
});
