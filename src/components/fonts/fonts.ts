import { componentInterface, includeComponent } from '../../factory'

interface FontMetrics {[k: string]: number}

export default function getFontMetrics(): Promise<componentInterface> {
    
    return new Promise((resolve, reject) => {
        try {
            const availableFonts = [
                'Arial',
                'Helvetica',
                'Times New Roman',
                'Times',
                'Courier New',
                'Courier',
                'Verdana',
                'Georgia',
                'Palatino',
                'Garamond',
                'Bookman',
                'Comic Sans MS',
                'Trebuchet MS',
                'Arial Black',
                'Impact',
                'Lucida Sans Unicode',
                'Tahoma',
                'Geneva',
                'Century Gothic',
                'Lucida Console',
                'Arial Narrow',
                'Arial Rounded MT',
                'Gill Sans',
                'Franklin Gothic Medium',
                'Optima',
                'Century',
                'Candara',
                'Constantia',
                'Lucida Bright',
                'Perpetua',
                'Rockwell',
                'Segoe UI',
                'Segoe Print',
                'Segoe Script',
                'Calibri',
                'Myriad',
                'Helvetica Neue',
                'PT Sans',
                'PT Serif',
                'Open Sans',
                'Roboto',
                'Lato',
                'Montserrat',
                'Oswald',
                'Raleway',
                'Source Sans Pro',
                'Ubuntu',
                'Droid Sans',
                'Noto Sans',
                'Fira Sans',
                'Poppins',
                'Playfair Display',
                'Bebas Neue',
                'Roboto Condensed',
                'Exo',
                'Merriweather',
                'Arimo',
                'Titillium Web',
                'Muli',
                'Josefin Sans',
                'Arvo',
                'Indie Flower',
                'Pacifico',
                'Varela Round',
                'Quicksand',
                'Nunito',
                'Dosis',
                'Orbitron',
                'Cabin',
                'Poppins',
                'Archivo',
                'Crimson Text',
                'Merriweather Sans',
                'Rajdhani',
                'Prompt',
                'Barlow',
                'Rubik',
                'Inconsolata',
                'IBM Plex Sans',
                'Space Mono',
                'Work Sans',
                'Karla',
                'Bitter',
                'DM Sans',
                'Inter',
                'DM Serif Display',
                'DM Serif Text',
                'Public Sans',
                'Sora',
                'Inter',
                'Nunito Sans',
                'Manrope',
                'Recursive',
                'Taviraj',
                'Lexend',
                'DM Mono',
                'Fira Code',
                'IBM Plex Mono',
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

includeComponent('fonts', getFontMetrics);