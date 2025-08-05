# ThumbmarkJS
![GitHub package.json dynamic](https://img.shields.io/github/package-json/version/ilkkapeltola/thumbmarkjs)
![NPM Version](https://img.shields.io/npm/v/@thumbmarkjs/thumbmarkjs)
![NPM Downloads](https://img.shields.io/npm/dm/%40thumbmarkjs%2Fthumbmarkjs)
![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/%40thumbmarkjs%2Fthumbmarkjs)


ThumbmarkJS is now the world's best **free** browser fingerprinting JavaScript library. It is used to generate over a billion thumbmarks every month.

The client ThumbmarkJS library is open source (MIT). There also an API version. Learn more at [ThumbmarkJS website](https://www.thumbmarkjs.com).

ThumbmarkJS is meant to be used for good. Use this to prevent scammers and spammers for example. If you see this library being used for evil, contact me.

🕺 Join the [Thumbmark Discord channel](https://discord.gg/PAqxQ3TnDA)

Have a look at the [IOS](https://github.com/thumbmarkjs/thumbmark-swift) and [Android](https://github.com/thumbmarkjs/thumbmark-android) versions as well.

## How well does it perform?

Even the client library alone works adequately to distinguish common browsers. Sampled data show a uniqueness of around and above 90%.

Mileage may vary though. Mac/Safari users tend to either clash more than Windows users, or be too unique (noise in the components). It does depend on your audience, too.

With the added entropy from an API call, that includes server-side components by investigating headers, TLS handshake signatures etc, it gets veeery unique. Like 99%.

## Simple usage from CDN

Transpiled bundles are available now on [JSDelivr](https://www.jsdelivr.com/).

Supported module formats:
- UMD: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js
- CommonJS: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.cjs.js
- ESM: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.esm.js

### And on the web page:

```javascript

import('https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js')
.then(() => {
  const tm = new ThumbmarkJS.Thumbmark();
  tm.get().then((res) => {
      console.log(res)
  })
})

```

## Options are... optional

More thorough documentation at [docs.thumbmarkjs.com](https://docs.thumbmarkjs.com/docs/options/usage).

Options are passed to the Thumbmark constructor so:

```javascript
const tm = new ThumbmarkJS.Thumbmark({
  option_key: option_value
})
```

|  option |     type |                             example | what it does |
| - | - | - | - |
| api_key | string | 'ae8679607bf79f......' | Setting this to a key you've obtained from [https://thumbmarkjs.com](thumbmarkjs.com) makes thumbmarks incredibly more unique
| exclude | string[] | ['webgl', 'system.browser.version'] | Removes components from the fingerprint hash. An excluded top-level component improves performance. |
| include | string[] | ['webgl', 'system.browser.version'] | Only includes the listed components. exclude still excludes included components. |
| permissions_to_check | string[] | ['gyroscope', 'accelerometer'] | Checks only selected permissions. Like 'include', but more low-level. Permissions take the longest to resolve, so this is if you need to cut down some milliseconds. |
| timeout | integer | 5000 | Default is 5000. Component timeout in milliseconds.
| logging | boolean | true | Default is true. Some releases collect at most 0.01% logs to improve the library. This doesn't affect the user. |
| performance | boolean | false | Default is false. Setting to true includes millisecond performance of component resolving |
| stabilize | string[] | ['private', 'iframe'] | A preset exclusion list for different scenarios. Default is `['private', 'iframe']` which means thumbmark uses settings designed to stabilize for private browsing and iframes (i.e. thumbmark should be stable over those situations).

example usage:

```javascript
const tm_api = new ThumbmarkJS.Thumbmark({
    api_key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    exclude: ['math']
});
```


## Custom components

You can add custom components to the hash with `includeComponent`, which takes two parameters, the `key` being the key of the component in the JSON and the function that returns the value (a string, a number or a JSON object). So for example, if you wanted to include an IP address in the components, you could do it like so:

```javascript
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

const tm = new ThumbmarkJS.Thumbmark();
tm.includeComponent('ip_address', fetchIpAddress)
```

The function is expected to return a `Promise`, but it seems it works without, too.

## Install with NPM

Installing from NPM:

```bash
npm install @thumbmarkjs/thumbmarkjs
```

and in your code

```javascript
import { Thumbmark } from '@thumbmarkjs/thumbmarkjs'
```

To implement ThumbmarkJS in a Next.js app, you can use a component [like this](examples/nextjs.tsx).

:warning: the library is meant to be running in the browser. Let me know if the library fails on a server side import, that shouldn't happen. Just you can't try to calculate the fingerprint server-side.

## Build it yourself

Clone this repo and then run

```
npm run install
npm run build
```

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
