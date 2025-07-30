import { componentInterface } from '../factory';

/**
 * Recursively sorts the keys of a component object alphabetically.
 * This ensures a consistent order for hashing.
 * @param obj The component object to sort.
 * @returns A new object with sorted keys.
 */
export function sortComponentKeys(obj: componentInterface): componentInterface {
    // Arrays, primitives, and null values are returned as is.
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
    }

    return Object.keys(obj)
        .sort()
        .reduce((acc: componentInterface, key: string) => {
            const value = obj[key];
            // Recurse for nested objects
            acc[key] = sortComponentKeys(value as componentInterface);
            return acc;
        }, {});
}