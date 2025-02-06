# ThumbmarkJS
![GitHub package.json dynamic](https://img.shields.io/github/package-json/version/ilkkapeltola/thumbmarkjs)
![NPM Version](https://img.shields.io/npm/v/@thumbmarkjs/thumbmarkjs)
![NPM Downloads](https://img.shields.io/npm/dm/%40thumbmarkjs%2Fthumbmarkjs)


ThumbmarkJS is now the world's best **free** browser fingerprinting JavaScript library.

ThumbmarkJS is open source (MIT).

🙏 Please don't do evil. ThumbmarkJS is meant to be used for good. Use this to prevent scammers and spammers for example. If you see this library being used for evil, contact me.

🕺 Join the [Thumbmark Discord channel](https://discord.gg/PAqxQ3TnDA)

## Demo page

You can help this project by visiting the demo page that **logs your fingerprint for analysis**. The logged fingerprint data is only used to improve this library. Visit the page from the link: [Show and log my fingerprint](https://www.thumbmarkjs.com/)

The library works very well to distinguish common browsers.

Data collected through this demo page show an accuracy of 90.5%-95.5% (95% confidence interval) in identifying a unique visitor correctly.

Mileage may vary though. Mac/Safari users tend to clash more than Windows users, and it does depend on your audience.

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
| exclude | string[] | ['webgl', 'system.browser.version'] | Removes components from the fingerprint hash. An excluded top-level component improves performance. |
| include | string[] | ['webgl', 'system.browser.version'] | Only includes the listed components. exclude still excludes included components. |
| logging | boolean | true | Default is true. Setting to false disables the anonymous 0.1% log sampling that is used to improve the library. |

example usage:

```
ThumbmarkJS.setOption('exclude', ['webgl', 'system.browser.version'])
```

## Custom components

You can add custom components to the hash with `includeComponent`, which takes two parameters, the `key` being the key of the component in the JSON and the function that returns the value (a string, a number or a JSON object). So for example, if you wanted to include an IP address in the components, you could do it like so:

```
function fetchIpAddress() {
  return new Promise((resolve, reject) => {
    fetch('http://checkip.amazonaws.com')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(ip => resolve({'ip_address': ip.trim()}))
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
        reject(error);
      });
  });
}

ThumbmarkJS.includeComponent('tcp', fetchIpAddress);
```

The function is expected to return a `Promise`, but it seems it works without, too.

**NOTE** I don't recommend making calls to external websites like this, since it adds a huge lag to running the fingerprint. You can see for yourself by running `ThumbmarkJS.getFingerprintPerformance()`. But it's possible.

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
