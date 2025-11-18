import { componentInterface } from '../../factory';
import { mostFrequentValuesInArrayOfDictionaries } from '../../utils/getMostFrequent';
import { optionsInterface } from '../../options';

const defaultPermissionKeys: PermissionName[] = [
    'accelerometer',
    'accessibility', 'accessibility-events',
    'ambient-light-sensor',
    'background-fetch', 'background-sync', 'bluetooth',
    'camera',
    'clipboard-read',
    'clipboard-write',
    'device-info', 'display-capture',
    'gyroscope', 'geolocation',
    'local-fonts',
    'magnetometer', 'microphone', 'midi',
    'nfc', 'notifications',
    'payment-handler',
    'persistent-storage',
    'push',
    'speaker', 'storage-access',
    'top-level-storage-access',
    'window-management',
    'query',
] as PermissionName[];

export default async function getPermissions(options?: optionsInterface): Promise<componentInterface> {
    const permission_keys = options?.permissions_to_check || defaultPermissionKeys;
    const retries = 3;

    // Run permission checks multiple times
    const results = await Promise.all(
        Array.from({ length: retries }, () => getBrowserPermissionsOnce(permission_keys))
    );

    // Get most frequent values across all retries
    const permissionStatus = mostFrequentValuesInArrayOfDictionaries(results, permission_keys);

    return permissionStatus;
}

async function getBrowserPermissionsOnce(permission_keys: PermissionName[]): Promise<componentInterface> {
    const permissionStatus: { [key: string]: string } = {};
    for (const feature of permission_keys) {
        try {
            // Request permission status for each feature
            const status = await navigator.permissions.query({ name: feature });
            // Assign permission status to the object
            permissionStatus[feature] = status.state.toString();
        } catch (error) {
            // In case of errors (unsupported features, etc.), do nothing. Not listing them is the same as not supported
        }
    }
    return permissionStatus;
}