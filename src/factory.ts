/**
 * This file is used to create the includeComponent function as well as the interfaces each of the
 * fingerprint components must implement.
 * 
 */

import { options, optionsInterface } from './fingerprint/options';

// the component interface is the form of the JSON object the function's promise must return
export interface componentInterface {
    [key: string]: string | string[] | number | boolean | componentInterface;
}


// The component function's interface is simply the promise of the above
export interface componentFunctionInterface {
    (): Promise<componentInterface>;
}

// components include a dictionary of name: function.
 export const components: {[name: string]: componentFunctionInterface} = {};

//In case a promise time-outs, this is what we use as the value in place
export const timeoutInstance: componentInterface = {
    'timeout': "true"
}

/** 
 * includeComponent is the function each component function needs to call in order for the component to be included
 * in the fingerprint.
 * @param {string} name - the name identifier of the component
 * @param {componentFunctionInterface} creationFunction - the function that implements the component
 * @returns 
 */ 
export const includeComponent = (name:string, creationFunction: componentFunctionInterface) => {
    if (typeof window !== 'undefined')
        components[name] = creationFunction;
}

/**
 * The function turns the map of component functions to a map of Promises when called
 * @returns {[name: string]: <Promise>componentInterface} 
 */
export const getComponentPromises = () => {
    return Object.fromEntries(
        Object.entries(components)
            .filter(([key]) => {
                return !options?.exclude?.includes(key)}
                )
            .filter(([key]) => {
                return options?.include?.some(e => e.includes('.'))
                    ? options?.include?.some(e => e.startsWith(key))
                    : options?.include?.length === 0 || options?.include?.includes(key)
            }
                    )
            .map(([key, value]) => [key, value()])
    );
}
