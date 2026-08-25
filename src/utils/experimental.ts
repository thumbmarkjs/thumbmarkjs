import { componentInterface } from '../factory';

// ===================== Experimental payload (Internal) =====================

/**
 * The payload artifact, built and published by the `experimental` repo and
 * served as `text/plain`. The minified sibling of `experimental.js`: same
 * envelope, same signals, roughly a quarter of the bytes. Prefer it here --
 * this is fetched on a metered path in someone else's page, and the readable
 * form exists to be read by humans, not shipped to browsers.
 * @internal
 */
export const EXPERIMENTAL_PAYLOAD_URL = 'https://experimental.thumbmarkjs.com/experimental.min.js';

/**
 * Bounds the whole fetch + evaluate cycle. The payload's own harness races each
 * individual signal against a much shorter timeout, so this only has to bound
 * the network round-trip and a pathological evaluation.
 */
const EXPERIMENTAL_TIMEOUT_MS = 2000;

/** The artifact is capped at 64 KB at build time; this is the ceiling on top. */
const MAX_PAYLOAD_BYTES = 131072;

/** Keeps one verbose browser message from bloating the logged payload. */
const MAX_ERROR_MESSAGE_LENGTH = 200;

/**
 * Everything that can go wrong on our side of the payload. A union rather than
 * prose, so the set is compiler-enforced and a typo cannot reach the backend.
 */
type RequestErrorType =
    | 'fetch'        // never completed: offline, DNS, or connect-src forbids the origin
    | 'http'         // non-2xx from the CDN, status in `message`
    | 'empty'        // 2xx with no body
    | 'oversized'    // far larger than the artifact's build-time cap
    | 'eval_blocked' // a script-src directive without 'unsafe-eval'
    | 'syntax'       // the artifact text did not parse
    | 'threw'        // it parsed, then threw or rejected
    | 'malformed'    // it evaluated to something that is not a valid envelope
    | 'timeout';     // the cycle outran its bound

interface ExperimentalError {
    /**
     * `request` — delivering the payload; raised here, and the only target we
     * raise. `signal` — computing one signal; raised by the payload itself and
     * passed through untouched. Split because they have different owners: a
     * request error is about the integrator's environment, a signal error is
     * about the payload's own code.
     */
    target: 'request' | 'signal';
    /** A RequestErrorType, or whatever the payload reports for a signal. */
    type: string;
    message?: string;
    /** Which signal failed. Only meaningful when `target` is `signal`. */
    signal?: string;
}

/**
 * `schema` versions this shape and starts at 1 in any published artifact, so
 * `schema: 0` means no payload ran and `errors` says why. `payload_id` changes
 * on every build and identifies which artifact produced a given set of signals.
 */
interface ExperimentalEnvelope {
    schema: number;
    payload_id: string;
    signals: componentInterface;
    errors: ExperimentalError[];
}

/**
 * The envelope returned when the payload could not be fetched, evaluated, or
 * trusted — so a failure is distinguishable from a payload that produced no
 * signals. Without it both look alike, and the sampled log silently
 * under-represents environments where the payload never runs, most of all
 * sites whose CSP forbids `unsafe-eval` or the payload origin.
 */
function requestFailed(type: RequestErrorType, message?: string): ExperimentalEnvelope {
    const error: ExperimentalError = { target: 'request', type };
    if (message) error.message = message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
    return { schema: 0, payload_id: 'none', signals: {}, errors: [error] };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Hygiene against a malformed or half-deployed artifact, not a security
 * boundary — by the time this runs the code has already executed, so a hostile
 * artifact has had its way regardless. The trust boundary is the origin.
 *
 * `errors` is deliberately not required: no published artifact emits one yet,
 * and one that does must not be rejected by an older library.
 */
function isValidEnvelope(value: unknown): value is ExperimentalEnvelope {
    if (!isPlainObject(value)) return false;
    // schema 0 is the failure marker, so a real artifact claiming it is malformed.
    if (typeof value.schema !== 'number' || value.schema < 1) return false;
    if (typeof value.payload_id !== 'string') return false;
    return isPlainObject(value.signals);
}

/** Browsers raise EvalError when script-src omits 'unsafe-eval', SyntaxError when the text will not parse. */
function classifyEvalFailure(error: unknown): RequestErrorType {
    if (error instanceof SyntaxError) return 'syntax';
    if (error instanceof EvalError) return 'eval_blocked';
    return 'threw';
}

function messageOf(error: unknown): string | undefined {
    return error instanceof Error ? error.message : undefined;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
    });
    // Clearing matters on someone else's page: without it the timer keeps its
    // closure alive for the full two seconds on every call, long after the
    // fetch has settled.
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Fetches and evaluates the payload. Always resolves to an envelope, never
 * throws and never rejects — every failure becomes a `request` entry in
 * `errors`. Nothing here may break fingerprinting for the caller.
 * @internal
 */
export async function getExperimentalPayload(): Promise<ExperimentalEnvelope> {
    try {
        return (await withTimeout(fetchAndEvaluate(), EXPERIMENTAL_TIMEOUT_MS))
            ?? requestFailed('timeout', `exceeded ${EXPERIMENTAL_TIMEOUT_MS}ms`);
    } catch (error) {
        // Reachable: a hostile value can throw from a proxy trap, inside either
        // isValidEnvelope or the spread that follows it.
        return requestFailed('threw', messageOf(error));
    }
}

async function fetchAndEvaluate(): Promise<ExperimentalEnvelope> {
    let text: string;
    try {
        const response = await fetch(EXPERIMENTAL_PAYLOAD_URL, { method: 'GET' });
        if (!response.ok) return requestFailed('http', `HTTP ${response.status}`);
        text = await response.text();
    } catch (error) {
        return requestFailed('fetch', messageOf(error));
    }

    if (!text) return requestFailed('empty');
    if (text.length > MAX_PAYLOAD_BYTES) return requestFailed('oversized', `${text.length} chars`);

    let result: unknown;
    try {
        // Indirect eval — global scope rather than this module's, which is what
        // the payload expects and what stops bundlers rewriting identifiers
        // inside it. The artifact is an IIFE whose completion value is the
        // envelope, or a promise of one.
        const indirectEval = eval;
        result = await Promise.resolve(indirectEval(text));
    } catch (error) {
        return requestFailed(classifyEvalFailure(error), messageOf(error));
    }

    if (!isValidEnvelope(result)) return requestFailed('malformed');

    // Spread rather than rebuild: a future artifact may carry fields this
    // version has never heard of, and dropping them would defeat shipping
    // payload changes without a library release. Only `errors` is normalized.
    return { ...result, errors: Array.isArray(result.errors) ? result.errors : [] };
}
