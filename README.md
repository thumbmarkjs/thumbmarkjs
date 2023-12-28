# visitFP

VisitFP is a simple JavaScript library that creates a fingerprint hash of the browser. It is easy to use and easily extendable.

This library is not intended to be robust against trickery such as plugins that deliberately are used to trick you.

VisitFP is open source (GPL-3.0).

## Simple usage from CDN

```javascript
<script src="https://cdn.ilkkapeltola.com/visitfp/latest/visitFP.js"></script>
<script>
    visitFP.getFingerprint().then(
        function(fp) {
            console.log(fp);
        }
    );
</script>
```
You can also call `visitFP.getFingerprintData()` to get a full JSON object with all its components.


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
- [ua-parser-js](https://uaparser.js.org/) details
- and a bunch of smaller things

## Technical details

I wanted to create something that's easy to build, extend and use. If you're interested in how the library works, the structure is very simple.

Have a look at the [technical_details](technical_details.md)