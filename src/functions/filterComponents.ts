import { componentInterface } from "../factory";
import { optionsInterface } from "../options";

// ===================== Data Filtering =====================

/**
 * Recursively filters a componentInterface object by include/exclude options.
 *
 * @param obj - The object to filter
 * @param options - Filtering options
 * @param path - Current path (for recursion)
 * @returns Filtered object
 */
export function filterThumbmarkData(
    obj: componentInterface,
    options?: optionsInterface,
    path: string = ""
): componentInterface {
    const result: componentInterface = {};
    const excludeList = options?.exclude || [];
    const includeList = options?.include || [];

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path + key + ".";

        if (typeof value === "object" && !Array.isArray(value)) {
            const filtered = filterThumbmarkData(value, options, currentPath);
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