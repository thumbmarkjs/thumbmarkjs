import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Guards the dual CommonJS/ES module packaging of this package.
 *
 * package.json declares "type": "module". Node then parses EVERY .js file in this package
 * as ESM, no matter what the rest of the filename says — so a CommonJS build named
 * `thumbmark.cjs.js` is loaded as ESM and dies on its own `exports.x = ...` with
 * "ReferenceError: exports is not defined in ES module scope".
 * The CommonJS artifact must therefore end in `.cjs`.
 *
 * See https://nodejs.org/api/packages.html#determining-module-system
 */
const pkgRoot = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));

describe('package.json module resolution', () => {
  const isTypeModule = pkg.type === 'module';

  it('declares "type": "module" (assumption the rules below rest on)', () => {
    expect(isTypeModule).toBe(true);
  });

  it('points "main" at a CommonJS file that Node will actually parse as CommonJS', () => {
    expect(pkg.main).toMatch(/\.cjs$/);
  });

  it('points the "require" export condition at a .cjs file', () => {
    expect(pkg.exports['.'].require).toMatch(/\.cjs$/);
  });

  it('never exposes a .js file through the "require" condition while "type" is "module"', () => {
    // The regression this suite exists to prevent: a .js file reached via `require`
    // in a type:module package is parsed as ESM and cannot work as CommonJS.
    const requirePaths = Object.values(pkg.exports as Record<string, { require?: string }>)
      .map((cond) => cond.require)
      .filter((p): p is string => typeof p === 'string');

    expect(requirePaths.length).toBeGreaterThan(0);
    for (const p of requirePaths) {
      expect(p.endsWith('.js')).toBe(false);
    }
  });
});

/**
 * The static checks above cannot prove the built file actually loads, and this suite
 * deliberately does NOT use jest's own `require`: jest wraps every module in a CommonJS
 * wrapper that injects `exports`/`module`/`require` and ignores "type": "module"
 * entirely, so the broken build loads fine under jest and the bug stays invisible.
 * Only a real `node` process reproduces Node's resolution. Skipped when dist/ is absent.
 */
const cjsPath = join(pkgRoot, pkg.main);
const built = existsSync(cjsPath);
const describeIfBuilt = built ? describe : describe.skip;

describeIfBuilt('built CommonJS artifact (requires `npm run build`)', () => {
  it('loads under a real node process and exposes its named exports', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tmjs-cjs-'));
    const probe = join(dir, 'probe.cjs');
    // A real file, never `node -e`: `node -e` leaks a global `exports` binding that
    // silently absorbs the writes and turns this test green against a broken build.
    writeFileSync(
      probe,
      `const tm = require(${JSON.stringify(cjsPath)});\n` +
        `if (typeof tm.getThumbmark !== 'function') { throw new Error('getThumbmark missing'); }\n` +
        `process.stdout.write('ok');\n`
    );

    const out = execFileSync(process.execPath, [probe], { encoding: 'utf8' });
    expect(out).toBe('ok');
  });
});
