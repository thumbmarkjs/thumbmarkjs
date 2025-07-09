import { optionsInterface } from "./options";
import { getThumbmark, getVersion, includeComponent as globalIncludeComponent } from './functions';
import { defaultOptions } from "./options";
import { componentInterface } from "./factory";

/**
 * A client for generating thumbmarks with a persistent configuration.
 */
    
export class Thumbmark {
    private options: optionsInterface;
  
    /**
     * Creates a new Thumbmarker client instance.
     * @param options - Default configuration options for this instance.
     */
    constructor(options?: optionsInterface) {
      this.options = { ...defaultOptions, ...options };
    }
  
    /**
     * Generates a thumbmark using the instance's configuration.
     * @param overrideOptions - Options to override for this specific call.
     * @returns The thumbmark result.
     */
    public async get(overrideOptions?: optionsInterface): Promise<any> {
      const finalOptions = { ...this.options, ...overrideOptions };
      return getThumbmark(finalOptions);
    }
    public getVersion(): string {
      return getVersion()
    }
    /**
     * Register a custom component to be included in the fingerprint.
     * @param key - The component name
     * @param fn - The component function
     */
    public includeComponent(key: string, fn: (options?: optionsInterface) => Promise<componentInterface | null>) {
      globalIncludeComponent(key, fn);
    }
}