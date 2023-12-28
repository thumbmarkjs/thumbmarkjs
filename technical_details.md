# Technical details

Here's the structure of the src folder:

```
components/
  audio/
    audio.ts
  canvas/
    canvas.ts
  etc../
utils/
  hash.ts
  raceAll.ts
declarations.d.ts
factory.ts
index.ts
```

The folder structure of `components/` doesn't really matter. I just wanted it to look neat.

## How a component of the fingerprint is implemented

The first thing to know to understand how the library works is to understand one single component. Let's look at a simple one 'system'. here:

```typescript
import { componentInterface, includeComponent } from '../../factory';

function getSystemDetails(): Promise<componentInterface> {
    return new Promise((resolve) => {
        resolve( {
        'platform': window.navigator.platform,
        'cookieEnabled': window.navigator.cookieEnabled,
        'productSub': navigator.productSub,
        'product': navigator.product
    });
});
}

includeComponent('system', getSystemDetails);
```

It includes a single component function `getSystemDetails()` that returns a `Promise<componentInterface>`. All components implement this same interface.

The function in question is included in the fingerprint by calling the function `includeComponent` with a name identifier, and the component function.

And to do this, you just need the `componentInterface` and the `includeComponent` function by importing them from `../../factory`.

## What the factory.ts does

The purpose of the `factory.ts` is to implement the common interfaces for the fingerprint component functions and keep a list of all the components that are included.

When you call `includeComponent` in one of the component modules, the component function gets added to a dictionary called `components`. This is a simple JSON dictionary with key->value pairs where the `key` is the name identifier given for `includeComponent` and the value is the component function.

`factory.ts` exports a function `getComponentPromises()` that then iterates over the component functions in the `components` dictionary and returns an equal kind of dictionary with the `Promises` for each respective component function.

The `getComponentPromises()` is called in the main entry point when someone wants to create the fingerprint.

## Putting it all together

The main entry point `index.ts` doesn't really do that much.
It simply includes all `.ts` files from under `./components`, which add the component functions.
It then gets the promise map with `getComponentPromises()`. It races each promise against a timeout.
At time out the promises that are still pending return a `timeoutInstance`.
The function `getFingerprintData()` returns the promise of the component map, while the function `getFingerprint()` returns the promise of a hash based on the resolved component map.