// Define an interface for the browser result
interface BrowserResult {
    name: string;
    version: string;
  }
  
  // Define a function to parse the user agent string and return the browser name and version
export function getBrowser(): BrowserResult {
    const ua = navigator.userAgent
    // Define some regular expressions to match different browsers and their versions
    const regexes = [
      // Chrome, Chromium, Edge, Opera, Vivaldi, Brave, etc.
      /(?<name>(?:Chrome|Chromium|Edg|Edge|OPR|Opera|Vivaldi|Brave))\/(?<version>\d+(?:\.\d+)?)/,
      // Firefox, Waterfox, etc.
      /(?<name>(?:Firefox|Waterfox|Iceweasel|IceCat))\/(?<version>\d+(?:\.\d+)?)/,
      // Safari, Mobile Safari, etc.
      /(?<name>Safari)\/(?<version>\d+(?:\.\d+)?)/,
      // Internet Explorer, IE Mobile, etc.
      /(?<name>MSIE|Trident|IEMobile).+?(?<version>\d+(?:\.\d+)?)/,
      // Other browsers that use the format "BrowserName/version"
      /(?<name>[A-Za-z]+)\/(?<version>\d+(?:\.\d+)?)/,
      // Samsung internet browser
      /(?<name>SamsungBrowser)\/(?<version>\d+(?:\.\d+)?)/
    ];
  
    // Loop through the regexes and try to find a match
    for (const regex of regexes) {
      const match = ua.match(regex);
      if (match && match.groups) {
        // Return the browser name and version
        return {
          name: match.groups.name,
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
  
