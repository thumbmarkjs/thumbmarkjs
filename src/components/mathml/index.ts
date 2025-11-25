import { componentInterface } from '../../factory';
import { hash } from '../../utils/hash';
import { ephemeralIFrame } from '../../utils/ephemeralIFrame';
import { stableStringify } from '../../utils/stableStringify';

const BLACKBOARD_BOLD = ['\uD835\uDD04', '\uD835\uDD05', '\u212D', '\uD835\uDD07', '\uD835\uDD08', '\uD835\uDD09', '\uD835\uDD38', '\uD835\uDD39', '\u2102', '\uD835\uDD3B', '\uD835\uDD3C', '\uD835\uDD3D'];
const GREEK_SYMBOLS = ['\u03B2', '\u03C8', '\u03BB', '\u03B5', '\u03B6', '\u03B1', '\u03BE', '\u03BC', '\u03C1', '\u03C6', '\u03BA', '\u03C4', '\u03B7', '\u03C3', '\u03B9', '\u03C9', '\u03B3', '\u03BD', '\u03C7', '\u03B4', '\u03B8', '\u03C0', '\u03C5', '\u03BF'];

export default async function getMathML(): Promise<componentInterface | null> {
  return new Promise((resolve) => {
    try {
      ephemeralIFrame(async ({ iframe }) => {
        try {
          if (!isMathMLSupported(iframe)) {
            resolve({
              supported: false,
              error: 'MathML not supported'
            });
            return;
          }

          const structures = [
            createMathML('integral', '<msubsup><mo>\u222B</mo><mi>a</mi><mi>b</mi></msubsup><mfrac><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo></mrow><mrow><mi>g</mi><mo>(</mo><mi>x</mi><mo>)</mo></mrow></mfrac><mi>dx</mi>'),
            createMathML('fraction', '<mfrac><mrow><mi>\u03C0</mi><mo>\u00D7</mo><msup><mi>r</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><mi>\u03C3</mi></mrow></mfrac>'),
            createMathML('matrix', '<mo>[</mo><mtable><mtr><mtd><mi>\u03B1</mi></mtd><mtd><mi>\u03B2</mi></mtd></mtr><mtr><mtd><mi>\u03B3</mi></mtd><mtd><mi>\u03B4</mi></mtd></mtr></mtable><mo>]</mo>'),
            createComplexNestedStructure(),
            ...createSymbolStructures()
          ];

          const dimensionsArray: any[] = [];
          let fontStyleHash: string = '';

          structures.forEach((struct, i) => {
            const measurement = measureMathMLStructure(struct, iframe);
            // Extract dimensions for this structure
            dimensionsArray.push({
              width: measurement.dimensions.width,
              height: measurement.dimensions.height
            });
            // Capture font style hash from the first structure (it's the same for all)
            if (i === 0 && measurement.fontInfo) {
              fontStyleHash = hash(stableStringify(measurement.fontInfo));
            }
          });

          const details = {
            fontStyleHash,
            dimensions: dimensionsArray
          };

          resolve({
            //supported: true,
            details,
            hash: hash(stableStringify(details))
          });

        } catch (error) {
          resolve({
            supported: false,
            error: `MathML error: ${(error as Error).message}`
          });
        }
      });
    } catch (error) {
      resolve({
        supported: false,
        error: `MathML error: ${(error as Error).message}`
      });
    }
  });
}

function isMathMLSupported(iframe: Document): boolean {
  try {
    const testElement = iframe.createElement('math');
    testElement.innerHTML = '<mrow><mi>x</mi></mrow>';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';

    iframe.body.appendChild(testElement);
    const rect = testElement.getBoundingClientRect();
    iframe.body.removeChild(testElement);

    return rect.width > 0 && rect.height > 0;
  } catch {
    return false;
  }
}

function createMathML(name: string, content: string): string {
  return `<math><mrow>${content}</mrow></math>`;
}

function createComplexNestedStructure(): string {
  let nestedContent = '<mo>\u220F</mo>'; // Product symbol (∏)

  // Add all symbol combinations inside the main structure
  BLACKBOARD_BOLD.forEach((bbSymbol, bbIndex) => {
    const startIdx = bbIndex * 2;
    const greekSet = GREEK_SYMBOLS.slice(startIdx, startIdx + 2);

    if (greekSet.length === 2) {
      nestedContent += `<mmultiscripts><mi>${bbSymbol}</mi><none/><mi>${greekSet[1]}</mi><mprescripts></mprescripts><mi>${greekSet[0]}</mi><none/></mmultiscripts>`;
    }
  });

  return createMathML('complex_nested',
    `<munderover><mmultiscripts>${nestedContent}</mmultiscripts></munderover>`
  );
}

function createSymbolStructures(): string[] {
  const structures: string[] = [];

  // Use blackboard bold as base symbols with Greek symbols as subscripts/superscripts
  BLACKBOARD_BOLD.forEach((bbSymbol, bbIndex) => {
    // Get 2 Greek symbols for this blackboard bold symbol (lower left, top right)
    const startIdx = bbIndex * 2;
    const greekSet = GREEK_SYMBOLS.slice(startIdx, startIdx + 2);

    if (greekSet.length === 2) {
      structures.push(createMathML('combined',
        `<mmultiscripts><mi>${bbSymbol}</mi><none/><mi>${greekSet[1]}</mi><mprescripts></mprescripts><mi>${greekSet[0]}</mi><none/></mmultiscripts>`
      ));
    }
  });

  return structures;
}

function measureMathMLStructure(mathml: string, iframe: Document): any {
  try {
    const mathElement = iframe.createElement('math');
    mathElement.innerHTML = mathml.replace(/<\/?math>/g, '');
    mathElement.style.whiteSpace = 'nowrap';
    mathElement.style.position = 'absolute';
    mathElement.style.visibility = 'hidden';
    mathElement.style.top = '-9999px';

    iframe.body.appendChild(mathElement);

    const rect = mathElement.getBoundingClientRect();
    const iframeWindow = iframe.defaultView || window;
    const computedStyle = iframeWindow.getComputedStyle(mathElement);

    const measurements = {
      dimensions: {
        width: rect.width,
        height: rect.height,

      },
      fontInfo: {
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        fontStyle: computedStyle.fontStyle,
        lineHeight: computedStyle.lineHeight,
        // Enhanced font properties for better system detection
        fontVariant: computedStyle.fontVariant || 'normal',
        fontStretch: computedStyle.fontStretch || 'normal',
        fontSizeAdjust: computedStyle.fontSizeAdjust || 'none',
        textRendering: computedStyle.textRendering || 'auto',
        fontFeatureSettings: computedStyle.fontFeatureSettings || 'normal',
        fontVariantNumeric: computedStyle.fontVariantNumeric || 'normal',
        fontKerning: computedStyle.fontKerning || 'auto'
      }
    };

    iframe.body.removeChild(mathElement);
    return measurements;

  } catch (error) {
    return {
      error: (error as Error).message
    };
  }
}