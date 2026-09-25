import { optionsInterface, DEFAULT_COLLECT_ENDPOINT } from '../options';
import type { collectDirective } from '../functions/api';

// ================= Collect beacon, server-directed (Internal) =================

/**
 * Destination for the one-shot beacon that pairs a browser's User-Agent with
 * its computed thumbmark, sent only when the pro API's response instructs
 * the client to send one (see apiResponse.collect). The collector observes the TLS
 * handshake of this same connection server-side, so this must be a direct
 * browser-to-host request -- no proxy, no CDN in front of it.
 *
 * Defined in `../options` (same precedent as `DEFAULT_API_ENDPOINT`) and
 * re-exported here so this module's own consumers/tests don't need a second
 * import.
 * @internal
 */
export { DEFAULT_COLLECT_ENDPOINT };

/** Server rejects (400) rather than truncates; stay under these or omit the field. */
const MAX_UA_BYTES = 512;
const MAX_THUMBMARK_BYTES = 64;
/**
 * Caps for the two newer fields mirror the collector's own published limits
 * for `ja4` and `ja4_source` exactly (not a conservative guess). The
 * collector rejects the WHOLE request with a 400 on an oversized field
 * rather than truncating it, and an over-cap field loses the whole beacon
 * -- including `ua`/`thumbmark` -- so the client caps must be no looser
 * than the server's. A missing `ja4` must never prevent the beacon -- the
 * collector still computes its own JA4 from the connection, so the beacon
 * is useful regardless.
 */
const MAX_JA4_BYTES = 64;
const MAX_JA4_SOURCE_BYTES = 32;

/** Distinct from log.ts's own `_tmjs_l` -- this mechanism owns its own guard. */
const SESSION_GUARD_KEY = '_tmjs_c';

function byteLength(value: string): number {
    return new TextEncoder().encode(value).length;
}

/**
 * True if this browser session has already attempted (not necessarily
 * succeeded) a collect beacon. Read-only -- unlike the write side
 * (markAttemptedThisSession), checking this never itself counts as an
 * attempt, so it can be evaluated before any transport has been chosen.
 * Fails OPEN (returns false, i.e. "not yet attempted") if sessionStorage is
 * unavailable or throws -- never lets storage access decide whether the
 * feature works.
 */
function hasAttemptedThisSession(): boolean {
    try {
        if (typeof sessionStorage === 'undefined') return false;
        return !!sessionStorage.getItem(SESSION_GUARD_KEY);
    } catch {
        return false;
    }
}

/**
 * Marks this session as having attempted a collect beacon. Call only once
 * a transport has actually been dispatched -- `sendBeacon` returned `true`,
 * or the fallback `fetch(...)` call was issued without throwing
 * synchronously -- never earlier, so a session in which nothing could be
 * dispatched (e.g. `sendBeacon` threw and the fetch fallback also threw
 * synchronously) is free to retry on a later call. Best-effort only: relies
 * on sessionStorage, which fails silently if unavailable and can be cleared
 * by the page, so this is not an enforced per-session cap.
 */
function markAttemptedThisSession(): void {
    try {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(SESSION_GUARD_KEY, '1');
    } catch { /* best effort only */ }
}

/**
 * Sends the one-shot collect beacon when the caller (index.ts) has already
 * determined the pro API asked the client to send one (apiResult.collect is
 * present as a directive object). `directive` carries whatever the server
 * observed for this request that it wants echoed back -- today that is the
 * `ja4`/`source` fields, but the caller and this function stay agnostic
 * about what's being collected; they only act on "a directive object is
 * present, so send a beacon". `directive.source` is named to match the API
 * *response* field (`collect.source`); the beacon *body* sent to the
 * collector uses the wire field `ja4_source` instead -- see the mapping
 * below. This naming difference is intentional, not a bug. Never throws,
 * never rejects, is never
 * awaited by its caller, never affects the returned fingerprint, and
 * carries no sampling/targeting logic of its own -- that lives entirely
 * server-side. As a best-effort default, at most one attempt per browser
 * session (see hasAttemptedThisSession / markAttemptedThisSession), which
 * also covers the case where a cached API response keeps re-reporting a
 * collect directive across repeated getThumbmark() calls within the same
 * session. This guard is not an enforced cap: it relies on sessionStorage,
 * which fails open when blocked and can be
 * cleared by the page.
 * @internal
 */
export function sendCollectBeacon(
    thumbmark: string,
    options: optionsInterface,
    directive?: collectDirective,
): void {
    try {
        if (options.collect_beacon === false) return;
        if (!thumbmark || byteLength(thumbmark) > MAX_THUMBMARK_BYTES) return;
        if (hasAttemptedThisSession()) return;

        const endpoint = options.collect_endpoint || DEFAULT_COLLECT_ENDPOINT;
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const body: { ua?: string; thumbmark: string; ja4?: string; ja4_source?: string } = { thumbmark };
        if (ua && byteLength(ua) <= MAX_UA_BYTES) {
            body.ua = ua;
        }
        // else: omit ua entirely -- the server 400s the WHOLE request on an
        // oversized field, so a truncated ua would both fail to help and
        // ship a semantically wrong UA string.

        if (directive?.ja4 && byteLength(directive.ja4) <= MAX_JA4_BYTES) {
            body.ja4 = directive.ja4;
        }
        // else: omit ja4 entirely -- see MAX_JA4_BYTES/MAX_JA4_SOURCE_BYTES
        // comment above. Absent ja4 never blocks the rest of the beacon.

        if (directive?.source && byteLength(directive.source) <= MAX_JA4_SOURCE_BYTES) {
            body.ja4_source = directive.source;
        }
        // else: omit ja4_source entirely, same reasoning as ja4 above.

        const payload = JSON.stringify(body);

        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            let queued = false;
            try {
                queued = navigator.sendBeacon(endpoint, payload);
            } catch {
                // Some browsers throw (e.g. QuotaExceededError) instead of
                // returning false -- treat exactly like a `false` return and
                // fall through to the fetch fallback below.
                queued = false;
            }
            // `false` means the browser refused to queue it (backlog full,
            // or a connect-src CSP block) -- fall through to the fetch
            // fallback below instead of silently dropping the beacon.
            if (queued) {
                markAttemptedThisSession();
                return;
            }
        }

        // Fallback: sendBeacon absent, OR sendBeacon threw, OR sendBeacon
        // returned false.
        // mode:'no-cors' resolves (opaque response) rather than rejecting on
        // the CORS front; DNS/connection failures still reject, hence catch.
        try {
            const fetchPromise = fetch(endpoint, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                body: payload,
            });
            // The fetch() call was issued without throwing synchronously --
            // that counts as "dispatched" even though the returned promise
            // may still reject later, so only now do we mark the session.
            markAttemptedThisSession();
            // Fire-and-forget: nothing consumes the outcome, so attach the
            // handler to the fetch promise itself -- never race it, or a
            // late rejection after a timeout would go unhandled.
            fetchPromise.catch(() => { /* do nothing */ });
        } catch {
            // fetch() itself threw synchronously -- nothing was dispatched,
            // so leave the session guard unmarked and let a future call retry.
        }
    } catch { /* do nothing -- must never affect the caller */ }
}
