import { componentInterface, includeComponent } from '../../factory'

interface FontMetrics {[k: string]: number}

export default function getFontMetrics(): Promise<componentInterface> {
    
    return new Promise((resolve, reject) => {
        try {
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

            const textToRender = 'Hello, world!';

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const defaultWidth: number = measureSingleFont(ctx, 'moitätäeioleolemassa');
            let results: {[k: string]: any} = {};

            availableFonts.forEach((font) => {
                const fontWidth = measureSingleFont(ctx, font);
                if (fontWidth != defaultWidth)
                    results[font] = fontWidth;
            });

            resolve(results);

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

    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const defaultFont = ctx.font; // Store default font
    let width: number = 0;
    let results: FontMetrics = {};

    baseFonts.forEach((style) => {
        ctx.font = `72px ${font}, ${style}`; // Set a default font size
        width += ctx.measureText(text).width;
        results[style] = ctx.measureText(text).width;
    });

    ctx.font = defaultFont;
    return width;
}

//includeComponent('fonts', getFontMetrics);