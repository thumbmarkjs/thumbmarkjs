// Define an interface for the browser result
interface BrowserResult {
    name: string;
    version: string;
  }

  // Define a function to parse the user agent string and return the browser name and version
export function getBrowser(): BrowserResult {
  if (typeof navigator === 'undefined') {
    return {
      name: "unknown",
      version: "unknown"
    }
  }
  const ua = navigator.userAgent;
  // DeviceAtlas authoritative regex order and patterns
  const regexes = [
    // Samsung Internet (Android)
    /(?<name>SamsungBrowser)\/(?<version>\d+(?:\.\d+)+)/,
    // Edge (Chromium, Android, iOS)
    /(?<name>EdgA|EdgiOS|Edg)\/(?<version>\d+(?:\.\d+)+)/,
    // Opera (OPR, OPX, Opera Mini, Opera Mobi)
    /(?<name>OPR|OPX)\/(?<version>\d+(?:\.\d+)+)/,
    /Opera[\s\/](?<version>\d+(?:\.\d+)+)/,
    /Opera Mini\/(?<version>\d+(?:\.\d+)+)/,
    /Opera Mobi\/(?<version>\d+(?:\.\d+)+)/,
    // Vivaldi
    /(?<name>Vivaldi)\/(?<version>\d+(?:\.\d+)+)/,
    // Brave (Brave/1.62.153)
    /(?<name>Brave)\/(?<version>\d+(?:\.\d+)+)/,
    // Chrome iOS (CriOS)
    /(?<name>CriOS)\/(?<version>\d+(?:\.\d+)+)/,
    // Firefox iOS (FxiOS)
    /(?<name>FxiOS)\/(?<version>\d+(?:\.\d+)+)/,
    // Chrome, Chromium (desktop & Android)
    /(?<name>Chrome|Chromium)\/(?<version>\d+(?:\.\d+)+)/,
    // Firefox (desktop & Android)
    /(?<name>Firefox|Waterfox|Iceweasel|IceCat)\/(?<version>\d+(?:\.\d+)+)/,
    // Safari (desktop & iOS): prefer Version/x.y if present, else Safari/x.y
    /Version\/(?<version1>[\d.]+).*Safari\/[\d.]+|(?<name>Safari)\/(?<version2>[\d.]+)/,
    // Internet Explorer, IE Mobile
    /(?<name>MSIE|Trident|IEMobile).+?(?<version>\d+(?:\.\d+)+)/,
    // Other browsers that use the format "BrowserName/version"
    /(?<name>[A-Za-z]+)\/(?<version>\d+(?:\.\d+)+)/,
  ];

  // Map UA tokens to canonical browser names
  const browserNameMap: { [key: string]: string } = {
    'edg': 'Edge',
    'edga': 'Edge',
    'edgios': 'Edge',
    'opr': 'Opera',
    'opx': 'Opera',
    'crios': 'Chrome',
    'fxios': 'Firefox',
    'samsung': 'SamsungBrowser',
    'vivaldi': 'Vivaldi',
    'brave': 'Brave',
  };

  for (const regex of regexes) {
    const match = ua.match(regex);
    if (match) {
      let name = match.groups?.name;
      let version = match.groups?.version || match.groups?.version1 || match.groups?.version2;
      // For Safari, if Version/x.y matched, set name to Safari
      if (!name && (match.groups?.version1 || match.groups?.version2)) name = 'Safari';
      // Fallbacks for legacy Opera/Opera Mini/Opera Mobi
      if (!name && regex.source.includes('Opera Mini')) name = 'Opera Mini';
      if (!name && regex.source.includes('Opera Mobi')) name = 'Opera Mobi';
      if (!name && regex.source.includes('Opera')) name = 'Opera';
      // Fallback for generic [A-Za-z]+/version
      if (!name && match[1]) name = match[1];
      if (!version && match[2]) version = match[2];
      if (name) {
        const canonical = browserNameMap[name.toLowerCase()] || name;
        return { name: canonical, version: version || 'unknown' };
      }
    }
  }
  return {
    name: "unknown",
    version: "unknown"
  };
}

// Utility function to detect if a user agent is a mobile device (DeviceAtlas-style)
export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  const ua = navigator.userAgent;
  // Exclude iPad from 'mobile' (treat as tablet)
  return /Mobi|Android|iPhone|iPod|IEMobile|Opera Mini|Opera Mobi|webOS|BlackBerry|Windows Phone/i.test(ua)
    && !/iPad/i.test(ua);
}
  
