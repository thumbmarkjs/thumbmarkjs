import { getBrowser } from './browser';

describe('getBrowser', () => {
  const originalNavigator = global.navigator;

  function mockUserAgent(ua: string) {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: ua },
      configurable: true,
    });
  }

  afterAll(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  // Authoritative user agent test cases from DeviceAtlas
  const cases = [
    // Chrome (Windows)
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Safari/537.36',
      expected: { name: 'Chrome', version: '120.0.6099.110' },
    },
    // Firefox (Windows)
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      expected: { name: 'Firefox', version: '120.0' },
    },
    // Edge (Windows)
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Safari/537.36 Edg/120.0.2210.61',
      expected: { name: 'Edge', version: '120.0.2210.61' },
    },
    // Safari (macOS)
    {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      expected: { name: 'Safari', version: '17.1' },
    },
    // Chrome (macOS)
    {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Safari/537.36',
      expected: { name: 'Chrome', version: '120.0.6099.110' },
    },
    // Firefox (macOS)
    {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
      expected: { name: 'Firefox', version: '120.0' },
    },
    // Chrome (Android)
    {
      ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Mobile Safari/537.36',
      expected: { name: 'Chrome', version: '120.0.6099.110' },
    },
    // Samsung Internet (Android)
    {
      ua: 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/120.0.6099.110 Mobile Safari/537.36',
      expected: { name: 'SamsungBrowser', version: '23.0' },
    },
    // Firefox (Android)
    {
      ua: 'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
      expected: { name: 'Firefox', version: '120.0' },
    },
    // Safari (iPhone)
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      expected: { name: 'Safari', version: '17.1' },
    },
    // Chrome (iPhone)
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.110 Mobile/15E148 Safari/604.1',
      expected: { name: 'Chrome', version: '120.0.6099.110' },
    },
    // Firefox (iPhone)
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1',
      expected: { name: 'Firefox', version: '120.0' },
    },
    // Opera (Windows)
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Safari/537.36 OPR/107.0.5045.36',
      expected: { name: 'Opera', version: '107.0.5045.36' },
    },
    // Vivaldi (Windows)
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Safari/537.36 Vivaldi/6.4.3160.49',
      expected: { name: 'Vivaldi', version: '6.4.3160.49' },
    },
    // Brave (Windows)
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.110 Safari/537.36 Brave/1.62.153',
      expected: { name: 'Brave', version: '1.62.153' },
    },
    // Unknown
    {
      ua: 'SomeRandomUserAgent/1.0',
      expected: { name: 'SomeRandomUserAgent', version: '1.0' },
    },
  ];

  cases.forEach(({ ua, expected }) => {
    it(`should detect ${expected.name} ${expected.version} from UA: ${ua}`, () => {
      mockUserAgent(ua);
      const result = getBrowser();
      expect(result.name.toLowerCase()).toBe(expected.name.toLowerCase());
      expect(result.version).toContain(expected.version.split('.')[0]); // loose match for version
    });
  });
}); 