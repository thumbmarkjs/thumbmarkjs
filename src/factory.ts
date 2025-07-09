/**
 * This file is used to create the includeComponent function as well as the interfaces each of the
 * fingerprint components must implement.
 * 
 */

import { optionsInterface } from './options';
//import { getComponentPromises } from './fingerprint/tm_functions';

// Import all built-in component functions
import getAudio from "./components/audio";
import getCanvas from "./components/canvas";
import getFonts from "./components/fonts";
import getHardware from "./components/hardware";
import getLocales from "./components/locales";
import getMath from "./components/math";
import getPermissions from "./components/permissions";
import getPlugins from "./components/plugins";
import getScreen from "./components/screen";
import getSystem from "./components/system";
import getWebGL from "./components/webgl";

/**
 * @description key->function map of built-in components. Do not call the function here.
 */
export const tm_component_promises = {
    'audio': getAudio,
    'canvas': getCanvas,
    'fonts': getFonts,
    'hardware': getHardware,
    'locales': getLocales,
    'math': getMath,
    'permissions': getPermissions,
    'plugins': getPlugins,
    'screen': getScreen,
    'system': getSystem,
    'webgl': getWebGL
};

// the component interface is the form of the JSON object the function's promise must return
export interface componentInterface {
    [key: string]: string | string[] | number | boolean | componentInterface;
};


// The component function's interface is simply the promise of the above
export interface componentFunctionInterface {
    (options?: optionsInterface): Promise<componentInterface | null>;
}

// components include a dictionary of name: function.
// Renamed to customComponents for clarity; this is for user-registered components.
export const customComponents: {[name: string]: componentFunctionInterface | null} = {};

//In case a promise time-outs, this is what we use as the value in place
export const timeoutInstance: componentInterface = {
    'timeout': "true"
}

/** 
 * includeComponent is the function each component function needs to call in order for the component to be included
 * in the fingerprint.
 * @param {string} name - the name identifier of the component
 * @param {componentFunctionInterface} creationFunction - the function that implements the component
 * @returns nothing
 */ 
export const includeComponent = (name:string, creationFunction: componentFunctionInterface, options?: optionsInterface) => {
    customComponents[name] = creationFunction;
};