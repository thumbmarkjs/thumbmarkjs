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
/**
 * Builds the full exclusion list from user options and stabilization rules,
 * taking browser detection into account.
 */
export function getExcludeList(options?: optionsInterface, obj?: componentInterface): string[] {
    let browser = getBrowser();

    // Fallback to component data when getBrowser() returns unknown (server-side)
    if (browser.name === 'unknown' && obj) {
        const b = (obj.system as componentInterface)?.browser as componentInterface | undefined;
        if (b?.name) browser = { name: String(b.name), version: String(b.version || 'unknown') };
    }

    const name = browser.name.toLowerCase();
    const majorVer = parseInt(browser.version.split('.')[0] || '0', 10);
    const excludeList = [...(options?.exclude || [])];
    const stabilizationOptions = [...new Set([...(options?.stabilize || []), 'always'])];

    for (const option of stabilizationOptions) {
        const rules = stabilizationExclusionRules[option as keyof typeof stabilizationExclusionRules];
        if (!rules) continue;

        for (const rule of rules) {
            if (!('browsers' in rule) || rule.browsers?.some(br => {
                const m = br.match(/(.+?)(>=)(\d+)/);
                return m ? name === m[1] && majorVer >= +m[3] : name === br;
            })) {
                excludeList.push(...rule.exclude);
            }
        }
    }

    return excludeList;
}

export function filterThumbmarkData(
    obj: componentInterface,
    options?: optionsInterface,
): componentInterface {
    const excludeList = getExcludeList(options, obj);
    const includeList = options?.include || [];

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