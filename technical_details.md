# Technical details

Here's the structure of the src folder:

```
src/
├── components/
│   ├── audio/
│   │   └── index.ts
│   ├── canvas/
│   │   └── index.ts
│   ├── fonts/
│   │   └── index.ts
│   ├── ...
├── functions/
│   ├── index.ts
│   ├── legacy_functions.ts
│   └── ...
├── utils/
│   ├── hash.ts
│   └── raceAll.ts
│   └── ...
├── types/
│   └── global.d.ts
├── factory.ts
├── index.ts
├── options.ts
└── thumbmark.ts
```

## How a component of the fingerprint is implemented

The first thing to know to understand how the library works is to understand one single component. Let's look at a simple one 'system':

```typescript
import { componentInterface, includeComponent } from '../../factory';
import { optionsInterface } from '../../options';

export default function getSystem(options?: optionsInterface): Promise<componentInterface> {
    return new Promise((resolve) => {
        const browser = getBrowser();
        const result: componentInterface = {
            'platform': window.navigator.platform,
            'productSub': navigator.productSub,
            'product': navigator.product,
            'useragent': navigator.userAgent,
            'hardwareConcurrency': navigator.hardwareConcurrency,
            'browser': {'name': browser.name, 'version': browser.version },
        };
        resolve(result);
    });
}
```

It includes a single component function `getSystem()` that returns a `Promise<componentInterface>`. All components implement this same interface and can optionally accept an `optionsInterface` parameter for configuration.

The function is included in the fingerprint by the `factory.ts`

## What the factory.ts does

The purpose of the `factory.ts` is to:

1. **Define common interfaces** for fingerprint component functions
2. **Manage built-in components** by importing and mapping all component functions
3. **Handle user-registered components** through the `includeComponent` function
4. **Provide the component registry** that combines built-in and custom components

### Built-in Components
`factory.ts` imports all built-in component functions and exports them as `tm_component_promises`:

```typescript
export const tm_component_promises = {
    'audio': getAudio,
    'canvas': getCanvas,
    'fonts': getFonts,
    // ... all other components
};
```

### User Components
When you call `includeComponent` on your instance of the `Thumbmark` class, the component function gets added to a dictionary called `customComponents`:

```typescript
export const customComponents: {[name: string]: componentFunctionInterface | null} = {};

export const includeComponent = (name: string, creationFunction: componentFunctionInterface) => {
    customComponents[name] = creationFunction;
};
```

## Main fingerprinting logic

The main fingerprinting logic is in `src/functions/index.ts`:

### Component Resolution
The `resolveClientComponents` function:
1. Merges built-in and user-registered components
2. Filters components based on `include`/`exclude` options
3. Calls each component function with the current options
4. Times each component execution
5. Filters out null results and applies data filtering

### Main Entry Point
The `getThumbmark` function:
1. Merges built-in and custom components
2. Resolves all components with timing
3. Optionally calls the API with timeout handling
4. Returns the fingerprint with optional performance data

## Key Features

- **Extensible**: Users can register custom components via `includeComponent`
- **Configurable**: Components can accept options for customization
- **Performant**: Built-in timing and timeout handling
- **Backward Compatible**: Legacy API still works
- **Type Safe**: Full TypeScript support with proper interfaces