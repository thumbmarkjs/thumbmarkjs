import { optionsInterface } from "./fingerprint/options";
import { getThumbmark as _getThumbmark } from "./fingerprint/tm_functions";

/**
 * A client for generating thumbmarks with a persistent configuration.
 */
export const defaultOptions: optionsInterface = {
    exclude: [],
    include: [],
    logging: true,
    timeout: 1000
    };
    
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
      return _getThumbmark(finalOptions);
    }
  }