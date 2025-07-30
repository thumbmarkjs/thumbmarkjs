import * as packageJson from '../../package.json';

/**
 * Returns the current package version
 */
export function getVersion(): string {
    return packageJson.version;
}