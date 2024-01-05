# ThumbmarkJS

ThumbmarkJS is a simple JavaScript library that creates a fingerprint hash of the browser. It is easy to use and easily extendable. While not (yet) as good, it's a free open source alternative to the market leading [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs).

This library is not very robust against trickery such as plugins that deliberately are used to trick you. The library is still under development.

ThumbmarkJS is open source (MIT).

## Demo page

You can help this project by visiting the demo page that **logs your fingerprint for analysis**. The logged fingerprint data is only used to improve this library. Visit the page from the link below:

[Show and log my fingerprint](https://www.thumbmarkjs.com/)

## Simple usage from CDN

```javascript
<script src="https://cdn.thumbmarkjs.com/latest/Thumbmark.js"></script>
<script>
    ThumbmarkJS.getFingerprint().then(
        function(fp) {
            console.log(fp);
        }
    );
</script>
```

You can also call `ThumbmarkJS.getFingerprintData()` to get a full JSON object with all its components.

You can also get any previous version from the CDN by replacing `latest` with the version number. Currently the URL would be

`https://cdn.thumbmarkjs.com/0.11.1/Thumbmark.js`

## Or build it yourself

Clone this repo and then run

```
npm run install
npm run build
```

## Please help! ♥

Simply going to the page above (which logs your visit) helps a lot. It's all anonymous and only used to develop this library.
Let me know if you run into any errors by opening an issue. The discussion section is also open.

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
