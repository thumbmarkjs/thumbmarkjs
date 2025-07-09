import { componentInterface, includeComponent } from '../../factory';
import { mostFrequentValuesInArrayOfDictionaries } from '../../utils/getMostFrequent';
import { optionsInterface } from '../../options';
import { getBrowser } from '../system/browser';

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
    let permission_keys = options?.permissions_to_check || defaultPermissionKeys;
    const browser = getBrowser();
    if (browser.name.toLowerCase() === 'safari') { // removing from Safari due to iFrame handling
        permission_keys = permission_keys.filter((key) => !['camera', 'geolocation', 'microphone'].includes(key));
    }
    const retries = 3;
    const permissionPromises: Promise<componentInterface>[] = Array.from({length: retries}, () => getBrowserPermissionsOnce(permission_keys) );
    return Promise.all(permissionPromises).then((resolvedPermissions) => {
        const permission = mostFrequentValuesInArrayOfDictionaries(resolvedPermissions, permission_keys);
        return permission;
    });
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