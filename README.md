<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://www.thumbmarkjs.com/logo-dark.svg?v=2">
  <source media="(prefers-color-scheme: light)" srcset="https://www.thumbmarkjs.com/logo-light.svg?v=2">
  <img alt="ThumbmarkJS" src="https://www.thumbmarkjs.com/logo-dark.svg?v=2" height="60">
</picture><br><br>

[![NPM Version](https://img.shields.io/npm/v/@thumbmarkjs/thumbmarkjs)](https://www.npmjs.com/package/@thumbmarkjs/thumbmarkjs)
[![NPM Downloads](https://img.shields.io/npm/dm/%40thumbmarkjs%2Fthumbmarkjs)](https://www.npmjs.com/package/@thumbmarkjs/thumbmarkjs)
[![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/%40thumbmarkjs%2Fthumbmarkjs)](https://www.jsdelivr.com/package/npm/@thumbmarkjs/thumbmarkjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

ThumbmarkJS is a free, open-source JavaScript browser fingerprinting library. Use it to identify returning visitors, detect fraud and bots, and more — all client-side, with no backend required.

MIT-licensed and commercially usable, it is used on **60,000+ websites**, generating over a **billion fingerprints every month**.

## Try it now

Visit the [live demo →](https://www.thumbmarkjs.com/resources/demo/) to see your browser's fingerprint and the individual components that make it up.

Or paste this into your browser's developer console to get your fingerprint hash and component breakdown directly:

```javascript
import('https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js')
  .then(() => {
    const tm = new ThumbmarkJS.Thumbmark();
    tm.get().then((res) => console.log(res));
  })
```

## Performance

The client library achieves ~80% uniqueness across general browser populations. Mac/Safari users can show higher collision rates or higher noise depending on the audience.

### Need higher accuracy? Try the ThumbmarkJS API

The open-source library is great for many use cases, but if you need production-grade accuracy for fraud prevention or user identification, the [ThumbmarkJS API](https://www.thumbmarkjs.com) takes it significantly further. A free tier is available.

The API combines the client-side signals with server-side analysis — including TLS handshake details, HTTP headers, and connection-level data — to produce fingerprints with over 99% uniqueness. It also adds smart signals: bot detection, VPN and TOR detection, datacenter traffic identification, and a threat level score per visitor.

[Learn more at thumbmarkjs.com →](https://www.thumbmarkjs.com)

## Installation

### NPM

```bash
npm install @thumbmarkjs/thumbmarkjs
```

> ⚠️ ThumbmarkJS runs in the browser. It requires browser APIs to compute fingerprint components and cannot run server-side.

See the [NPM usage guide →](https://docs.thumbmarkjs.com/docs/installation/usage-npm)

### CDN (jsDelivr)

Transpiled bundles are available on [jsDelivr](https://www.jsdelivr.com/package/npm/@thumbmarkjs/thumbmarkjs):

| Format | URL |
|---|---|
| UMD | `https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.umd.js` |
| CommonJS | `https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.cjs.js` |
| ESM | `https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs/dist/thumbmark.esm.js` |

## Documentation

Full documentation at **[docs.thumbmarkjs.com](https://docs.thumbmarkjs.com/docs/intro)** — including installation, configuration, integrations, and the API reference.

### Configuration

Options are passed to the `Thumbmark` constructor:

```javascript
const tm = new ThumbmarkJS.Thumbmark({
  option_key: option_value
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `api_key` | string | — | API key from [thumbmarkjs.com](https://thumbmarkjs.com). Enables server-side signals and visitorId. |
| `exclude` | string[] | — | Components to exclude from the fingerprint hash. Excluding a top-level component also improves performance. |
| `include` | string[] | — | Only include these components. `exclude` still applies. |
| `permissions_to_check` | string[] | — | Limit which browser permissions are checked. Permissions are the slowest component to resolve. |
| `timeout` | integer | 5000 | Component timeout in milliseconds. |
| `logging` | boolean | true | At most 0.01% of runs collect anonymous logs to improve the library. Has no effect on users. |
| `performance` | boolean | false | When true, includes per-component resolution time in milliseconds. |
| `stabilize` | string[] | `['private', 'iframe']` | Preset exclusion list for stability across private browsing and iframes. |
| `metadata` | varies | — | Passed to webhooks. Does not affect the fingerprint. |

See the [configuration reference →](https://docs.thumbmarkjs.com/docs/configuration/options)

### Integrations

React, Vue, Angular, and Preact integration plugins are available. [See the integrations docs →](https://docs.thumbmarkjs.com/docs/category/integrations)

### Fingerprint components

ThumbmarkJS combines multiple browser fingerprinting techniques to maximise uniqueness. The following signals are collected client-side:

- Audio fingerprinting
- Canvas fingerprinting
- WebGL fingerprinting and GPU info
- Available fonts and rendering behaviour
- Hardware details
- Browser languages and timezone
- Math precision characteristics
- Browser permissions
- Installed plugins
- Screen details and media queries
- Speech synthesis voices
- System and browser details
- WebRTC fingerprinting

The following are available via the API only:

- TLS handshake details
- HTTP headers
- Connection and IP details

See the [full components reference →](https://docs.thumbmarkjs.com/docs/category/components)

### Custom components

Add your own signals to the fingerprint with `includeComponent(key, fn)`:

```javascript
tm.includeComponent('my_signal', () => 'custom_value');
```

The function can return a string, number, or object. See the [custom components docs →](https://docs.thumbmarkjs.com/docs/configuration/custom-components)

### Technical details

The library is intentionally simple to build, extend, and audit. See [technical_details.md](technical_details.md) for an overview of the architecture.

## Using ThumbmarkJS?

We'd love to hear about your use case. [Share your experience →](https://form.jotform.com/261132396063352)

## Community & support

- 💬 [Discord](https://discord.gg/PAqxQ3TnDA) — questions, ideas, and discussion
- 📧 [contact@thumbmarkjs.com](mailto:contact@thumbmarkjs.com)
- 📖 [Documentation](https://docs.thumbmarkjs.com)
