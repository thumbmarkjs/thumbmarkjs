import { componentInterface } from '../../factory'
import { hash } from '../../utils/hash'
import { getCommonPixels } from '../../utils/commonPixels';
import { getBrowser } from '../system/browser';

const _RUNS = (getBrowser().name !== 'SamsungBrowser') ? 1 : 3;
const _USE_CACHE = getBrowser().name !== 'Brave';

// Canvas and viewport dimensions — part of the fingerprint signal, do not change.
const _CANVAS_W = 200;
const _CANVAS_H = 100;
const _NUM_SPOKES = 137;

// Shader sources are constant — hoist to module scope to avoid per-call string allocation.
const _VERTEX_SHADER_SRC = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const _FRAGMENT_SHADER_SRC = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(0.812, 0.195, 0.553, 0.921); // Set line color
    }
`;

// Precompute the spoke vertices once at module load. The values are determined
// solely by _NUM_SPOKES, _CANVAS_W, and _CANVAS_H — all module constants —
// so they are identical to what the old per-call computation produced.
const _VERTICES: Float32Array = (() => {
    const v = new Float32Array(_NUM_SPOKES * 4);
    const angleIncrement = (2 * Math.PI) / _NUM_SPOKES;
    for (let i = 0; i < _NUM_SPOKES; i++) {
        const angle = i * angleIncrement;
        v[i * 4]     = 0;                                  // Center X
        v[i * 4 + 1] = 0;                                  // Center Y
        v[i * 4 + 2] = Math.cos(angle) * (_CANVAS_W / 2); // Endpoint X
        v[i * 4 + 3] = Math.sin(angle) * (_CANVAS_H / 2); // Endpoint Y
    }
    return v;
})();

interface WebGLCache {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    buffer: WebGLBuffer;
}

// Module-scope cache — only populated when _USE_CACHE is true (non-Brave).
let _cache: WebGLCache | null = null;

/**
 * Create a canvas, compile shaders, link program, and upload vertex data.
 * Returns null if any step fails so callers can degrade gracefully.
 */
function setupWebGL(): WebGLCache | null {
    try {
        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = _CANVAS_W;
        canvas.height = _CANVAS_H;

        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return null;

        gl.shaderSource(vertexShader, _VERTEX_SHADER_SRC);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) return null;

        gl.shaderSource(fragmentShader, _FRAGMENT_SHADER_SRC);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) return null;

        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

        const buffer = gl.createBuffer();
        if (!buffer) return null;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, _VERTICES, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return { canvas, gl, program, buffer };
    } catch (_) {
        return null;
    }
}

/**
 * For non-Brave browsers: lazily initialise once and reuse.
 * For Brave: always create fresh (Brave farbles WebGL per-context, preserving
 * the noise signal that today's per-call setup drives).
 */
function getOrInitCache(): WebGLCache | null {
    if (_USE_CACHE) {
        if (!_cache) _cache = setupWebGL();
        return _cache;
    }
    // Brave path: fresh context every call, byte-identical behaviour to pre-cache code.
    return setupWebGL();
}

/**
 * Execute one render pass on the shared (or fresh) WebGL context and return
 * the raw pixel data as an ImageData. Returns a 1×1 blank ImageData on error.
 */
function renderImage(cache: WebGLCache): ImageData {
    const { canvas, gl, program, buffer } = cache;
    try {
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        const positionAttribute = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.LINES, 0, _NUM_SPOKES * 2);

        const pixelData = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
        return new ImageData(pixelData, canvas.width, canvas.height);
    } catch (_) {
        return new ImageData(1, 1);
    } finally {
        // Reset WebGL state to match pre-cache behaviour.
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
    }
}

export default async function getWebGL(): Promise<componentInterface> {
    const cache = getOrInitCache();

    if (!cache) {
        return { 'webgl': 'unsupported' };
    }

    try {
        const imageDatas: ImageData[] = Array.from({ length: _RUNS }, () => renderImage(cache));
        const commonImageData = getCommonPixels(imageDatas, cache.canvas.width, cache.canvas.height);
        return {
            'commonPixelsHash': hash(commonImageData.data.toString()).toString(),
        };
    } catch (_) {
        return { 'webgl': 'unsupported' };
    }
}
