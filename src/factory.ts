/**
 * This file is used to create the includeComponent function as well as the interfaces each of the
 * fingerprint components must implement.
 * 
 */


// the component interface is the form of the JSON object the function's promise must return
 export interface componentInterface {
    [key: string]: string | string[] | number | boolean | undefined | componentInterface;
}


// The component function's interface is simply the promise of the above
export interface componentFunctionInterface {
    (): Promise<componentInterface>;
}

// components include a dictionary of name: function.
 export const components: {[name: string]: componentFunctionInterface} = {};

//In case a promise time-outs, this is what we use 
export const timeoutInstance: componentInterface = {
    'timeout': "true"
}

// 
export const includeComponent = (name:string, creationFunction: componentFunctionInterface) => {
    components[name] = creationFunction;
}

export const getComponentPromises = () => {
    return Object.fromEntries(
        Object.entries(components).map(([key, value]) => [key, value()])
    );
}