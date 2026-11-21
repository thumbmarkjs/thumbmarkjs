import { OptionsAfterDefaults } from '../options';

// ================= Environment observations (API request and sampled log) =================

/**
 * Raw environment observations sent to the API next to `components`, which the
 * API uses to compute `info.signals`. They are never part of the fingerprint,
 * never returned to the caller, and never sent anywhere except the API request
 * and the sampled diagnostic log.
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
    /**
     * Number of bytes that differ between two immediate reads of the same
     * unmodified 16x16 canvas. Always 0 in an unmodified browser; above 0 means
     * the canvas output is being altered per read (noise from a privacy-hardened
     * browser or an anti-fingerprinting extension).
     */
    canvasReadbackDiffBytes?: number;
}

type ObservationKey = Exclude<keyof ObservationsInterface, 'v'>;

/**
 * One cap for the whole collection, measured from when it starts. Every probe
 * reads its value synchronously, so in practice nothing waits for it; it is
 * only a safety net for a probe that never settles.
 */
const OBSERVATIONS_TIMEOUT_MS = 50;

const NAVIGATOR_ACCESSORS = ['hardwareConcurrency', 'userAgent', 'platform', 'language'];

const AUTOMATION_GLOBALS =
    '_phantom callPhantom __nightmare __webdriver_evaluate __selenium_evaluate __webdriver_script_function __driver_evaluate __fxdriver_evaluate __driver_unwrapped __selenium_unwrapped __fxdriver_unwrapped domAutomation domAutomationController'.split(' ');

const AD_BAIT_CLASSES =
    'ad-banner ad-container ad-slot banner-ad text-ad sponsored-ad google-ad ad-unit'.split(' ');

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

function canvasReadbackDiffBytes(): number | undefined {
    // Never attached to the document. Fixed shapes and no text, since text
    // rendering legitimately varies between machines. willReadFrequently avoids
    // Chrome's console warning about repeated readbacks.
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(8, 0, 8, 8);
    ctx.fillStyle = '#0000ff';
    ctx.beginPath();
    ctx.arc(8, 12, 4, 0, Math.PI * 2);
    ctx.fill();
    const first = ctx.getImageData(0, 0, 16, 16).data;
    const second = ctx.getImageData(0, 0, 16, 16).data;
    if (first.length !== second.length) return Math.max(first.length, second.length);
    let diff = 0;
    for (let i = 0; i < first.length; i++) if (first[i] !== second[i]) diff++;
    return diff;
}

/** Exported only so tests can swap in a slow probe. */
export const PROBES: Record<ObservationKey, () => unknown> = {
    webglVendorUnmasked: () => readWebglUnmasked().vendor,
    webglRendererUnmasked: () => readWebglUnmasked().renderer,
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
    canvasReadbackDiffBytes,
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
 * resolves once every key has settled or 50 ms after this call, whichever
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
