import getMathML from './index';

// Mock the ephemeralIFrame utility so we control the iframe document passed to the callback
jest.mock('../../utils/ephemeralIFrame', () => ({
  ephemeralIFrame: jest.fn(),
}));

import { ephemeralIFrame } from '../../utils/ephemeralIFrame';
const mockEphemeralIFrame = ephemeralIFrame as jest.MockedFunction<typeof ephemeralIFrame>;

/** Build a minimal fake iframe Document for use in tests. */
function makeFakeIframe(rectWidth: number, rectHeight: number): Document {
  const fakeRect = {
    width: rectWidth,
    height: rectHeight,
    top: 0, left: 0, bottom: rectHeight, right: rectWidth, x: 0, y: 0,
    toJSON: () => {},
  };

  const fakeComputedStyle = {
    fontFamily: 'serif',
    fontSize: '16px',
    fontWeight: '400',
    fontStyle: 'normal',
    lineHeight: '20px',
    fontVariant: 'normal',
    fontStretch: 'normal',
    fontSizeAdjust: 'none',
    textRendering: 'auto',
    fontFeatureSettings: 'normal',
    fontVariantNumeric: 'normal',
    fontKerning: 'auto',
  };

  // Track appended/removed children to avoid missing-child errors
  const children: Element[] = [];

  const fakeBody = {
    appendChild: (el: Element) => { children.push(el); return el; },
    removeChild: (el: Element) => {
      const idx = children.indexOf(el);
      if (idx !== -1) children.splice(idx, 1);
      return el;
    },
  };

  const fakeElement = {
    innerHTML: '',
    style: { position: '', visibility: '', top: '', whiteSpace: '' },
    getBoundingClientRect: jest.fn().mockReturnValue(fakeRect),
  };

  const fakeWindow = {
    getComputedStyle: jest.fn().mockReturnValue(fakeComputedStyle),
  };

  return {
    body: fakeBody,
    createElement: jest.fn().mockReturnValue(fakeElement),
    defaultView: fakeWindow,
  } as unknown as Document;
}

describe('mathml component tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns { supported: false } when MathML is not supported', async () => {
    // 0x0 rect means isMathMLSupported returns false
    const fakeIframe = makeFakeIframe(0, 0);
    mockEphemeralIFrame.mockImplementation(async (cb) => { await cb({ iframe: fakeIframe }); });

    const result = await getMathML();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('supported', false);
    expect(result).toHaveProperty('error', 'MathML not supported');
    expect(result).not.toHaveProperty('hash');
    expect(result).not.toHaveProperty('details');
  });

  test('returns { hash } without details on success path when MathML is supported', async () => {
    // Non-zero rect — isMathMLSupported returns true, success path runs
    const fakeIframe = makeFakeIframe(100, 20);
    mockEphemeralIFrame.mockImplementation(async (cb) => { await cb({ iframe: fakeIframe }); });

    const result = await getMathML();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hash');
    expect(typeof result!.hash).toBe('string');
    expect(result!.hash).not.toBe('');
    // details must NOT appear in the output
    expect(result).not.toHaveProperty('details');
    // supported key is absent from success shape
    expect(result).not.toHaveProperty('supported');
  });

  test('hash is stable across two calls with identical mocked measurements', async () => {
    const fakeIframe = makeFakeIframe(50, 15);
    mockEphemeralIFrame.mockImplementation(async (cb) => { await cb({ iframe: fakeIframe }); });

    const result1 = await getMathML();
    const result2 = await getMathML();

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.hash).toBe(result2!.hash);
  });

  test('resolves with { hash } (empty dimensions) when all individual measurements fail', async () => {
    // Support check passes (first element has non-zero rect) but all subsequent
    // createElement calls (used by measureMathMLStructure) throw — those are
    // caught internally by measureMathMLStructure and return { error }, so the
    // dimensions array is empty. The component must still resolve gracefully.
    let callCount = 0;
    const fakeComputedStyle = {
      fontFamily: 'serif', fontSize: '16px', fontWeight: '400', fontStyle: 'normal',
      lineHeight: '20px', fontVariant: 'normal', fontStretch: 'normal',
      fontSizeAdjust: 'none', textRendering: 'auto', fontFeatureSettings: 'normal',
      fontVariantNumeric: 'normal', fontKerning: 'auto',
    };
    const fakeBody = { appendChild: jest.fn(), removeChild: jest.fn() };
    const fakeWindow = { getComputedStyle: jest.fn().mockReturnValue(fakeComputedStyle) };
    const fakeIframe = {
      body: fakeBody,
      defaultView: fakeWindow,
      createElement: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Support check element: non-zero rect so isMathMLSupported returns true
          return {
            innerHTML: '',
            style: { position: '', visibility: '', top: '', whiteSpace: '' },
            getBoundingClientRect: jest.fn().mockReturnValue({ width: 100, height: 20 }),
          };
        }
        // All measurement elements: throw (caught by measureMathMLStructure internally)
        throw new Error('createElement failed');
      }),
    } as unknown as Document;

    mockEphemeralIFrame.mockImplementation(async (cb) => { await cb({ iframe: fakeIframe }); });

    const result = await getMathML();

    // Even with all measurements failing, we still get a hash (of the empty structure)
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hash');
    expect(typeof result!.hash).toBe('string');
    expect(result!.hash).not.toBe('');
    expect(result).not.toHaveProperty('details');
    expect(result).not.toHaveProperty('supported');
  });
});
