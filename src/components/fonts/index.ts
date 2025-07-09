import { componentInterface, includeComponent } from '../../factory'
import { ephemeralIFrame } from '../../utils/ephemeralIFrame'
import { getBrowser } from '../system/browser'
import { optionsInterface } from '../../fingerprint/options'

interface FontMetrics {[k: string]: number}

const availableFonts = [
    'Arial',
    'Arial Black',
    'Arial Narrow',
    'Arial Rounded MT',
    'Arimo',
    'Archivo',
    'Barlow',
    'Bebas Neue',
    'Bitter',
    'Bookman',
    'Calibri',
    'Cabin',
    'Candara',
    'Century',
    'Century Gothic',
    'Comic Sans MS',
    'Constantia',
    'Courier',
    'Courier New',
    'Crimson Text',
    'DM Mono',
    'DM Sans',
    'DM Serif Display',
    'DM Serif Text',
    'Dosis',
    'Droid Sans',
    'Exo',
    'Fira Code',
    'Fira Sans',
    'Franklin Gothic Medium',
    'Garamond',
    'Geneva',
    'Georgia',
    'Gill Sans',
    'Helvetica',
    'Impact',
    'Inconsolata',
    'Indie Flower',
    'Inter',
    'Josefin Sans',
    'Karla',
    'Lato',
    'Lexend',
    'Lucida Bright',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Manrope',
    'Merriweather',
    'Merriweather Sans',
    'Montserrat',
    'Myriad',
    'Noto Sans',
    'Nunito',
    'Nunito Sans',
    'Open Sans',
    'Optima',
    'Orbitron',
    'Oswald',
    'Pacifico',
    'Palatino',
    'Perpetua',
    'PT Sans',
    'PT Serif',
    'Poppins',
    'Prompt',
    'Public Sans',
    'Quicksand',
    'Rajdhani',
    'Recursive',
    'Roboto',
    'Roboto Condensed',
    'Rockwell',
    'Rubik',
    'Segoe Print',
    'Segoe Script',
    'Segoe UI',
    'Sora',
    'Source Sans Pro',
    'Space Mono',
    'Tahoma',
    'Taviraj',
    'Times',
    'Times New Roman',
    'Titillium Web',
    'Trebuchet MS',
    'Ubuntu',
    'Varela Round',
    'Verdana',
    'Work Sans',
  ];

  const baseFonts = ['monospace', 'sans-serif', 'serif'];

export default async function getFonts(options?: optionsInterface): Promise<componentInterface | null> {
  const browser = getBrowser()
  if (!['Firefox'].includes(browser.name))
    return getFontMetrics()
  return null;
}

export function getFontMetrics(): Promise<componentInterface> {
    
    return new Promise((resolve, reject) => {
        try {

            ephemeralIFrame(async ({ iframe }) => {
                const textToRender = 'Hello, world!';

                const canvas = iframe.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const defaultWidths: number[] = baseFonts.map((font) => {
                    return measureSingleFont(ctx, font)
                })

                let results: {[k: string]: any} = {};
                availableFonts.forEach((font) => {
                    const fontWidth = measureSingleFont(ctx, font);
                    if (!defaultWidths.includes(fontWidth))
                        results[font] = fontWidth;
                });
    
                resolve(results);
            })


        } catch (error) {
            reject({'error': 'unsupported'})
        }
    });
};


function measureSingleFont(ctx: CanvasRenderingContext2D | null, font: string): number {
    if (!ctx) {
        throw new Error('Canvas context not supported');
    }
    const text: string = "WwMmLli0Oo";
    const defaultFont = ctx.font; // Store default font
    ctx.font = `72px ${font}`; // Set a default font size
    return ctx.measureText(text).width;
}