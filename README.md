# ThumbmarkJS
![GitHub package.json dynamic](https://img.shields.io/github/package-json/version/ilkkapeltola/thumbmarkjs)
![NPM Version](https://img.shields.io/npm/v/@thumbmarkjs/thumbmarkjs)
![NPM Downloads](https://img.shields.io/npm/dm/%40thumbmarkjs%2Fthumbmarkjs)
![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/%40thumbmarkjs%2Fthumbmarkjs)

ThumbmarkJS is now the world's best **free** browser fingerprinting JavaScript library. It is used to generate over a **billion thumbmarks** every month.
Use this to prevent scammers and spammers for example. If you see this library being used for evil, contact me.

🆓 The client ThumbmarkJS library is open source (MIT). The **free** open source library provides the best-in-class free browser fingerprinting technology and can be used also commercially.

🆒 There also an enhanced **API version**. Learn more at [thumbmarkjs.com](https://www.thumbmarkjs.com).

The API version:
- Produces significantly **more unique fingerprints** by adding server-side components
- Adds a visitor ID that can **survive changes in the fingerprint**
- Can **distinguish users with the same, common fingerprint**
- Adds smart signals such as bot, vpn, tor & datacenter traffic detection, and also **threat level**
- Provides uniqueness scoring


---

🕺 Join the [ThumbmarkJS Discord channel](https://discord.gg/PAqxQ3TnDA) to discuss


## How well does it perform?

Even the client library alone works adequately to distinguish common browsers. Sampled data show a uniqueness of around 80%.

Mileage may vary though. Mac/Safari users tend to either clash more than Windows users, or be too unique (noise in the components). It does depend on your audience, too.

With the added entropy from an API call, that includes server-side components by investigating headers, TLS handshake signatures etc, it gets veeery unique. Over 99%.
The visitor ID further improves both uniqueness and especially stability. Detailed statistics coming.


# Documentation : [docs.thumbmarkjs.com](https://docs.thumbmarkjs.com/docs/intro)

This GitHub repository provides the very basic information on usage and installation. The web documentation is more thorough.

## Import from jsDelivr

Do [check the documentation](https://docs.thumbmarkjs.com/docs/category/installing) for how to install and use ThumbmarkJS whether it is by importing from CDN or installing from NPM.

Transpiled bundles are available on [JSDelivr](https://www.jsdelivr.com/package/npm/@thumbmarkjs/thumbmarkjs).

Supported module formats:
- UMD: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js
- CommonJS: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.cjs.js
- ESM: https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.esm.js

You can run this in developer console for example as a test:

```javascript

import('https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js')
.then(() => {
  const tm = new ThumbmarkJS.Thumbmark();
  tm.get().then((res) => {
      console.log(res)
  })
})

```

## Install with NPM

‼️ Please refer to the [documentation](https://docs.thumbmarkjs.com/docs/category/installing)

However, you get it from NPM:

```bash
npm install @thumbmarkjs/thumbmarkjs
```

To implement ThumbmarkJS in a React app, you can do [like this](https://docs.thumbmarkjs.com/docs/installation/usage-react).

:warning: the fingerprinting needs to run in a browser context. Let me know if the library fails on a server side import, that shouldn't happen. To calculate the components though, it needs the browser APIs.

## Build it yourself

Clone this repo and then run

```
npm run install
npm run build
```

## Options are... optional

Thorough documentation about options are at [docs.thumbmarkjs.com](https://docs.thumbmarkjs.com/docs/options/usage).

Options are passed to the Thumbmark class constructor, like so:

```javascript
const tm = new ThumbmarkJS.Thumbmark({
  option_key: option_value
})
```

|  option |     type |                             example | what it does |
| - | - | - | - |
| api_key | string | 'ae8679607bf79f......' | Setting this to a key you've obtained from [https://thumbmarkjs.com](thumbmarkjs.com) makes thumbmarks incredibly more unique and enables **visitorId**
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

You can add custom components to the hash with `includeComponent`, which takes two parameters, the `key` being the key of the component in the JSON and the function that returns the value (a string, a number or a JSON object). Custom components are described in [here in the documentation](https://docs.thumbmarkjs.com/docs/options/custom-components).


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
- TLS handshake details (API only)
- HTTP headers (API only)
- Connection/IP details (API only)

## Technical details

I wanted to create something that's easy to build, extend and use. If you're interested in how the library works, the structure is very simple.

Have a look at the [technical_details](technical_details.md)

## Mobile fingerprinting

Have a look at the [IOS](https://github.com/thumbmarkjs/thumbmark-swift) and [Android](https://github.com/thumbmarkjs/thumbmark-android) versions as well.

## Contact ThumbmarkJS

- email: thumbmark-contact@googlegroups.com
- discord: https://discord.gg/PAqxQ3TnDA