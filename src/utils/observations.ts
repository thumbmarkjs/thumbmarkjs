import { OptionsAfterDefaults } from '../options';

// ================= Environment observations (API request only) =================

/**
 * Raw environment observations sent to the API next to `components`, which the
 * API uses to compute `info.signals`. They are never part of the fingerprint,
 * never returned to the caller, and never sent anywhere except the API request.
 *
 * Every key is optional: a key is omitted when it could not be determined
 * (unsupported API, a probe that threw, or one that missed its deadline), so a
 * missing key is not the same as a negative result. Values are raw facts; the
 * client does no classification.
 */
export interface ObservationsInterface {
    /** Schema version. Always present, so the API can tell "nothing determinable" from an older client. */
    v: 1;
    /** UNMASKED_VENDOR_WEBGL, read through WEBGL_debug_renderer_info (on Gecko the plain VENDOR, which is already unmasked). */
    webglVendorUnmasked?: string;
    /** UNMASKED_RENDERER_WEBGL, read through WEBGL_debug_renderer_info (on Gecko the plain RENDERER, which is already unmasked). */
    webglRendererUnmasked?: string;
    /** Sorted MediaCapabilities verdicts, e.g. `h264:supported+smooth+powerEfficient`, `av1:unsupported` or `vp9:error`. */
    mediaDecode?: string[];
    /** navigator.webdriver as-is; omitted when it is not a boolean. */
    webdriver?: boolean;
    /** Names of legacy automation-driver globals found on the global object (including `cdc_` prefixed ones). */
    automationGlobals?: string[];
    /** Engine families (`blink`, `gecko`, `webkit`) whose engine-specific API marker is present. */
    engineApiMarkers?: string[];
    /** Navigator accessors (`hardwareConcurrency`, `userAgent`, `platform`, `language`) that are own properties of `navigator`. */
    navigatorAccessorOverrides?: string[];
    /** Navigator.prototype getters that returned normally for a foreign receiver instead of throwing. */
    getterNativeSourceTamper?: string[];
    /** navigator.hardwareConcurrency, unaffected by `stabilize`. */
    hardwareConcurrency?: number;
    /** Prototype-only methods (`push`, `hasOwnProperty`, `bind`, `getTime`, `createElement`) that exist as own properties. */
    overriddenPrototypeMethods?: string[];
    /** Generic ad-slot class names whose bait element collapsed to no box. */
    adBaitBlocked?: string[];
}

type ObservationKey = Exclude<keyof ObservationsInterface, 'v'>;

/** One cap for the whole collection, measured from when it starts. */
const OBSERVATIONS_TIMEOUT_MS = 500;

const NAVIGATOR_ACCESSORS = ['hardwareConcurrency', 'userAgent', 'platform', 'language'];

const AUTOMATION_GLOBALS =
    '_phantom callPhantom __nightmare __webdriver_evaluate __selenium_evaluate __webdriver_script_function __driver_evaluate __fxdriver_evaluate __driver_unwrapped __selenium_unwrapped __fxdriver_unwrapped domAutomation domAutomationController'.split(' ');

const AD_BAIT_CLASSES =
    'ad-banner ad-container ad-slot banner-ad text-ad sponsored-ad google-ad ad-unit'.split(' ');

const MEDIA_DECODE_SPEC: [contentType: string, label: string][] = [
    ['video/mp4; codecs="avc1.42E01E"', 'h264'],
    ['video/mp4; codecs="hvc1.1.6.L93.B0"', 'hevc'],
    ['video/webm; codecs="vp09.00.10.08"', 'vp9'],
    ['video/mp4; codecs="av01.0.05M.08"', 'av1'],
    ['audio/mp4; codecs="mp4a.40.2"', 'aac'],
    ['audio/webm; codecs="opus"', 'opus'],
];

const hasOwn = (target: object, name: string): boolean =>
    Object.prototype.hasOwnProperty.call(target, name);

// ===================== Probes =====================
// Each probe returns the raw value, or undefined to omit its key. A probe may
// throw or return a promise; the runner below handles both.

/** Gecko detected by an engine-only style property, not by parsing the user agent. */
const isGecko = (): boolean => 'MozAppearance' in document.documentElement.style;

// Created at most once per page load; the result (including "unavailable") is
// memoised so repeated getThumbmark() calls never create another context. The
// context is deliberately never released with WEBGL_lose_context, which makes
// Firefox log a console warning.
let webglUnmasked: { vendor?: string, renderer?: string } | undefined;

function readWebglUnmasked(): { vendor?: string, renderer?: string } {
    if (webglUnmasked) return webglUnmasked;
    webglUnmasked = {};
    try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (gl) {
            const read = (parameter: number) => {
                const value = gl.getParameter(parameter);
                return typeof value === 'string' && value ? value : undefined;
            };
            if (isGecko()) {
                // Since Firefox 92, VENDOR and RENDERER already return the
                // (sanitized) unmasked values, and getExtension on the deprecated
                // WEBGL_debug_renderer_info logs a console warning there.
                webglUnmasked = { vendor: read(gl.VENDOR), renderer: read(gl.RENDERER) };
            } else {
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                if (ext) webglUnmasked = { vendor: read(ext.UNMASKED_VENDOR_WEBGL), renderer: read(ext.UNMASKED_RENDERER_WEBGL) };
            }
        }
    } catch {
        // WebGL unavailable or blocked: both keys are omitted.
    }
    return webglUnmasked;
}

function mediaDecode(): Promise<string[] | undefined> | undefined {
    const capabilities = navigator.mediaCapabilities;
    if (!capabilities || typeof capabilities.decodingInfo !== 'function') return;
    const probes = MEDIA_DECODE_SPEC.map(([contentType, label]) => {
        const configuration: MediaDecodingConfiguration = contentType.startsWith('video/')
            ? { type: 'file', video: { contentType, width: 1920, height: 1080, bitrate: 4000000, framerate: 30 } }
            : { type: 'file', audio: { contentType, channels: '2', bitrate: 128000, samplerate: 48000 } };
        return Promise.resolve().then(() => capabilities.decodingInfo(configuration)).then(
            info => {
                const flags = (['supported', 'smooth', 'powerEfficient'] as const).filter(flag => info && info[flag]);
                return `${label}:${flags.length ? flags.join('+') : 'unsupported'}`;
            },
            // A rejected configuration is an answer for that codec only.
            () => `${label}:error`,
        );
    });
    // No timer of its own: a decodingInfo that never answers just stays pending and
    // is left out when the collection deadline passes.
    return Promise.all(probes).then(results => results.sort());
}

function adBaitBlocked(): string[] | undefined {
    if (!document.body) return;
    // Class names only (no ids), one off-screen fixed container, a single
    // batched geometry read, and removal in `finally`. Fixed positioning keeps
    // the container out of the page's scrollable overflow (also in RTL pages).
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:visible;pointer-events:none;';
    const baits = AD_BAIT_CLASSES.map(className => {
        const el = document.createElement('div');
        el.className = className;
        el.style.cssText = 'width:2px;height:2px;';
        container.appendChild(el);
        return el;
    });
    try {
        document.body.appendChild(container);
        return baits
            .filter(el => el.offsetParent === null || (el.offsetWidth === 0 && el.offsetHeight === 0))
            .map(el => el.className);
    } finally {
        container.parentNode?.removeChild(container);
    }
}

const PROBES: Record<ObservationKey, () => unknown> = {
    webglVendorUnmasked: () => readWebglUnmasked().vendor,
    webglRendererUnmasked: () => readWebglUnmasked().renderer,
    mediaDecode,
    webdriver: () => typeof navigator.webdriver === 'boolean' ? navigator.webdriver : undefined,
    automationGlobals: () => {
        const names = Object.getOwnPropertyNames(globalThis);
        return [
            ...AUTOMATION_GLOBALS.filter(name => names.includes(name)),
            ...names.filter(name => name.startsWith('cdc_') || name.startsWith('$cdc_')),
        ];
    },
    engineApiMarkers: () => {
        const w = window as unknown as Record<string, unknown>;
        const markers: [string, () => unknown][] = [
            ['blink', () => 'chrome' in window && typeof w.chrome === 'object'],
            ['gecko', () => typeof CSS === 'object' && typeof CSS.supports === 'function' && CSS.supports('-moz-appearance', 'none')],
            ['webkit', () => typeof w.safari === 'object' && w.safari !== null],
        ];
        return markers.filter(([, test]) => { try { return test(); } catch { return false; } }).map(([engine]) => engine);
    },
    navigatorAccessorOverrides: () => NAVIGATOR_ACCESSORS.filter(name => hasOwn(navigator, name)),
    getterNativeSourceTamper: () => {
        const prototype = Object.getPrototypeOf(navigator);
        return NAVIGATOR_ACCESSORS.filter(name => {
            const getter = Object.getOwnPropertyDescriptor(prototype, name)?.get;
            if (typeof getter !== 'function') return false;
            // A native getter throws for a receiver that is not a Navigator; a
            // script-defined one has no such check. Only a normal return counts.
            try { getter.call({}); } catch { return false; }
            return true;
        });
    },
    hardwareConcurrency: () => Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : undefined,
    overriddenPrototypeMethods: () => {
        const hits: string[] = [];
        if (hasOwn([], 'push')) hits.push('push');
        if (hasOwn({}, 'hasOwnProperty')) hits.push('hasOwnProperty');
        if (hasOwn(function () { /* probe target */ }, 'bind')) hits.push('bind');
        if (hasOwn(new Date(), 'getTime')) hits.push('getTime');
        // Only for a genuine Document: a plain-object stub owns its methods by construction.
        if (typeof Document === 'function' && document instanceof Document && hasOwn(document, 'createElement')) hits.push('createElement');
        return hits;
    },
    adBaitBlocked,
};

// ===================== Collection =====================

/**
 * The collection promise, plus `snapshot()` for reading the result later.
 */
export type ObservationsCollection = Promise<ObservationsInterface> & {
    /**
     * Resolves with every key that has resolved by now, including ones that
     * resolved after the deadline. If keys are still pending and the deadline
     * has not passed, waits for them only until the deadline.
     */
    snapshot(): Promise<ObservationsInterface>;
};

/**
 * Starts collecting observations. The returned promise never rejects and
 * resolves once every key has settled or 500 ms after this call, whichever
 * comes first, with the keys that resolved by then. A key still pending at the
 * deadline is omitted from it, but `snapshot()` picks it up if it resolves
 * before the request is built. Probes run off the calling stack (after the
 * current synchronous work), each isolated: a probe that throws omits only its
 * own key.
 *
 * Returns undefined when `exclude` contains `observations`. An
 * `observations.<key>` entry skips that probe entirely. `include` and
 * `stabilize` do not apply to observations.
 */
export function collectObservations(
    options: Pick<OptionsAfterDefaults, 'exclude'>,
): ObservationsCollection | undefined {
    const excluded = options.exclude || [];
    if (excluded.includes('observations')) return;

    const keys = (Object.keys(PROBES) as ObservationKey[]).filter(key => !excluded.includes(`observations.${key}`));
    // Filled live as probes resolve, even after the deadline.
    const observations: ObservationsInterface = { v: 1 };

    let remaining = keys.length;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    const done = () => { clearTimeout(timer); release(); };
    const timer = setTimeout(done, OBSERVATIONS_TIMEOUT_MS);
    if (!remaining) done();
    keys.forEach(key =>
        Promise.resolve()
            .then(PROBES[key])
            .then(value => {
                if (value != null) (observations as unknown as Record<string, unknown>)[key] = value;
            }, () => { /* a failed probe omits its key */ })
            .then(() => { if (!--remaining) done(); }),
    );

    const snapshot = () => ready.then(() => ({ ...observations }));
    return Object.assign(snapshot(), { snapshot });
}
