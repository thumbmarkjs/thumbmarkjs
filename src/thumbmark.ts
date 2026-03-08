import { optionsInterface } from "./options";
import { getThumbmarkWithCustomComponents, ThumbmarkResponse } from './functions';
import { getVersion } from "./utils/version";
import { defaultOptions } from "./options";
import { componentFunctionInterface, componentInterface } from "./factory";

/**
 * A client for generating thumbmarks with a persistent configuration.
 */
    
export class Thumbmark {
    private options: optionsInterface;
    private customComponents: Record<string, componentFunctionInterface | null>;
  
    /**
     * Creates a new Thumbmarker client instance.
     * @param options - Default configuration options for this instance.
     */
    constructor(options?: optionsInterface) {
      this.options = { ...defaultOptions, ...options };
      this.customComponents = {};
    }
  
    /**
     * Generates a thumbmark using the instance's configuration.
     * @param overrideOptions - Options to override for this specific call.
     * @returns The thumbmark result containing the fingerprint hash, components, and metadata.
     */
    public async get(overrideOptions?: optionsInterface): Promise<ThumbmarkResponse> {
      const finalOptions = { ...this.options, ...overrideOptions };
      return getThumbmarkWithCustomComponents(finalOptions, this.customComponents);
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
      this.customComponents[key] = fn;
    }
}
