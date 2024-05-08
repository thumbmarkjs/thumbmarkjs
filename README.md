# ThumbmarkJS
![GitHub package.json dynamic](https://img.shields.io/github/package-json/version/ilkkapeltola/thumbmarkjs)
![NPM Version](https://img.shields.io/npm/v/@thumbmarkjs/thumbmarkjs)
![NPM Downloads](https://img.shields.io/npm/dm/%40thumbmarkjs%2Fthumbmarkjs)


ThumbmarkJS is the world's second best browser fingerprinting JavaScript library. While not (yet?) as good, it's a free open source alternative to the market leading [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs). It is easy to use and easily extendable.

ThumbmarkJS is open source (MIT).

🙏 Please don't do evil. ThumbmarkJS is meant to be used for good. Use this to prevent scammers and spammers for example. If you see this library being used for evil, contact me.


## Demo page

You can help this project by visiting the demo page that **logs your fingerprint for analysis**. The logged fingerprint data is only used to improve this library. Visit the page from the link: [Show and log my fingerprint](https://www.thumbmarkjs.com/)

The library works very well to distinguish common browsers.

## Simple usage from CDN

Transpiled bundles are available now on [JSDelivr](https://www.jsdelivr.com/).

Supported module formats:
- UMD: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js
- CommonJS: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.cjs.js
- ESM: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.esm.js

### And on the web page:

```javascript
<script src="https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js"></script>
<script>
ThumbmarkJS.getFingerprint().then(
    function(fp) {
        console.log(fp);
    }
);
</script>

<!-- or -->

<script>
import('https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js')
.then(() => {
    ThumbmarkJS.getFingerprint().then((fp) => { console.log(fp)})
})
</script>

```

You can also call `ThumbmarkJS.getFingerprintData()` to get a full JSON object with all its components.

## Options

You can use the `setOption` method to change the behavior of the library. Currently it takes only one option.

|  option |     type |                             example | what it does |
| - | - | - | - |
| exclude | string[] | ['webgl', 'system.browser.version'] | removes components from the fingerprint hash. An excluded top-level component improves performance. |

example usage:

```
ThumbmarkJS.setOption('exclude', ['webgl', 'system.browser.version'])
```

## Install with NPM

Installing from NPM:

```bash
npm install @thumbmarkjs/thumbmarkjs
```

and in your code

```javascript
import { getFingerprint } from '@thumbmarkjs/thumbmarkjs'
```

To implement ThumbmarkJS in a Next.js app, you can use a component [like this](examples/nextjs.tsx).

:warning: note, thumbmarkjs was published up to version 0.12.1 to NPM package `thumbmarkjs` and from v0.12.1 onwards will be published under `@thumbmarkjs/thumbmarkjs`. I'll occasionally update the old location, but please update your imports.

But bear in mind that the library is meant to be running in the browser. Let me know if the library fails on a server side import. However, `getFingerprint()` is not meant to be called server side.

## Build it yourself

Clone this repo and then run

```
npm run install
npm run build
```

## How you can help

Simply going to the [Show and log my fingerprint](https://www.thumbmarkjs.com/)-page helps a lot. The logging is all anonymous and only used to develop this library. Let me know if you run into any errors by opening an issue. The discussion section is also open.

Test cases you can try:
- Check your fingerprint, then refresh the page with Ctrl + R
- Refresh without cache
- Move the window to another screen
- Try in incognito

if you see a fingerprint change when it shouldn't, you can use [this JSON Diff Finder tool](https://url-decode.com/tool/json-diff) to check what causes the diff.

## Components included in fingerprint
- audio fingerprint
- canvas fingerprint
- webgl fingerprint
- available fonts and how they render
- videocard
- browser languages and time zone
- browser permissions
- available plugins
- a ton of screen details including media queries
- and a bunch of smaller things

## Technical details

I wanted to create something that's easy to build, extend and use. If you're interested in how the library works, the structure is very simple.

Have a look at the [technical_details](technical_details.md)
