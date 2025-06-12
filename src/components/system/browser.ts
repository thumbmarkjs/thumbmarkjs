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
    const ua = navigator.userAgent
    // Define some regular expressions to match different browsers and their versions
    const regexes = [
      // Samsung internet browser
      /(?<name>SamsungBrowser)\/(?<version>\d+(?:\.\d+)?)/,
      // Edge
      /(?<name>Edge|Edg)\/(?<version>\d+(?:\.\d+)?)/,
      // Chrome, Chromium, Opera, Vivaldi, Brave, etc.
      /(?<name>(?:Chrome|Chromium|OPR|Opera|Vivaldi|Brave))\/(?<version>\d+(?:\.\d+)?)/,
      // Firefox, Waterfox, etc.
      /(?<name>(?:Firefox|Waterfox|Iceweasel|IceCat))\/(?<version>\d+(?:\.\d+)?)/,
      // Safari, Mobile Safari, etc.
      /(?<name>Safari)\/(?<version>\d+(?:\.\d+)?)/,
      // Internet Explorer, IE Mobile, etc.
      /(?<name>MSIE|Trident|IEMobile).+?(?<version>\d+(?:\.\d+)?)/,
      // Samsung browser (Tizen format)
      /(?<name>samsung).*Version\/(?<version>\d+(?:\.\d+)?)/i,
      // Other browsers that use the format "BrowserName/version"
      /(?<name>[A-Za-z]+)\/(?<version>\d+(?:\.\d+)?)/,
    ];
  
    // Define a map for browser name translations
    const browserNameMap: { [key: string]: string } = {
      'edg': 'Edge',
      'opr': 'Opera',
      'samsung': 'SamsungBrowser'
    };

    // Loop through the regexes and try to find a match
    for (const regex of regexes) {
      const match = ua.match(regex);
      if (match && match.groups) {
        // Translate the browser name if necessary
        const name = browserNameMap[match.groups.name.toLowerCase()] || match.groups.name;
        // Return the browser name and version
        return {
          name: name,
          version: match.groups.version
        };
      }
    }
  
    // If no match is found, return unknown
    return {
      name: "unknown",
      version: "unknown"
    };
  }
  
