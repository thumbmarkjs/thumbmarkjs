import { componentInterface } from "../factory";
import { optionsInterface } from "../options";
import { stabilizationExclusionRules } from "../options";
import { getBrowser } from "../components/system/browser";

// ===================== Data Filtering =====================

/**
 * Filters a componentInterface object based on include/exclude and stabilization options.
 *
 * @param obj - The object to filter
 * @param options - Filtering options
 * @returns Filtered object
 */
export function filterThumbmarkData(
    obj: componentInterface,
    options?: optionsInterface,
): componentInterface {
    // Get current browser name and version
    const browser = getBrowser();
    const name = browser.name.toLowerCase();
    const ver = browser.version.split('.')[0] || '0';
    const majorVer = parseInt(ver, 10);

    // Initialize excludeList with user-defined exclusions from options
    const excludeList = [...(options?.exclude || [])];
    const stabilizationOptions = options?.stabilize || [];
    const includeList = options?.include || [];

    // Expand the excludeList based on stabilization rules
    for (const option of stabilizationOptions) {
        const rules = stabilizationExclusionRules[option as keyof typeof stabilizationExclusionRules];
        if (!rules) continue;

        for (const rule of rules) {
            // FIX: Use the 'in' operator as a type guard to check if 'browsers' exists.
            // A rule applies to all browsers if the 'browsers' key is not present.
            const appliesToAllBrowsers = !('browsers' in rule);

            // The 'rule.browsers?' optional chaining here safely handles the case where 'browsers' is missing.
            const browserMatch = !appliesToAllBrowsers && rule.browsers?.some(browserRule => {
                const match = browserRule.match(/(.+?)(>=)(\d+)/);
                
                if (match) {
                    const [, ruleName, , ruleVersionStr] = match;
                    const ruleVersion = parseInt(ruleVersionStr, 10);
                    return name === ruleName && majorVer >= ruleVersion;
                }
                return name === browserRule;
            });

            if (appliesToAllBrowsers || browserMatch) {
                excludeList.push(...rule.exclude);
            }
        }
    }

    /**
     * Inner recursive function to perform the actual filtering.
     * Uses the fully prepared excludeList and includeList from the parent scope.
     * @param currentObj - The object to filter
     * @param path - Current path for nested keys
     * @returns A filtered object
     */
    function performFilter(currentObj: componentInterface, path: string = ""): componentInterface {
        const result: componentInterface = {};

        for (const [key, value] of Object.entries(currentObj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === "object" && !Array.isArray(value) && value !== null) {
                const filtered = performFilter(value, currentPath);
                if (Object.keys(filtered).length > 0) {
                    result[key] = filtered;
                }
            } else {
                const isExcluded = excludeList.some(exclusion => currentPath.startsWith(exclusion));
                const isIncluded = includeList.some(inclusion => currentPath.startsWith(inclusion));
                
                if (!isExcluded || isIncluded) {
                    result[key] = value;
                }
            }
        }
        return result;
    }

    // Start the filtering process
    return performFilter(obj);
}