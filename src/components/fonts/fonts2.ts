import { componentInterface, includeComponent } from '../../factory'
import { ephemeralIFrame, wait } from './ephemeralIFrame'
import { raceAll } from '../../utils/raceAll'

interface FontMetrics {[k: string]: number}

const basicFonts = ['monospace', 'sans-serif', 'serif']

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

export default function getFontMetrics(): Promise<componentInterface> {
    return new Promise((resolve, reject) => {
        try {
            ephemeralIFrame(async ({ iframe }) => {
                const fontWidthDict = await getFontWidthDict( iframe )
                resolve(fontWidthDict)
            }
            )
        } catch (error) {
            reject(error)
        }
    })

}

async function getFontWidthDict (iframe: Document): Promise<componentInterface> {
    
    if (!iframe)
        throw new Error("iframe doesn't exist")

    const body = iframe.body
    body.style.fontSize = '144pt'
    const div = iframe.createElement('div')
    body.appendChild(div)
    let fontWidthDict: componentInterface = {}
    const basicFontWidths = getBasicFontWidthArray(iframe, div)
    console.log(basicFontWidths)
    let fontDict: { [key:string]: HTMLElement} = {}
    availableFonts.forEach((font) => {
        const span = iframe.createElement('span')
        span.style.fontFamily = font
        span.textContent = 'mMwW0oOil1'
        div.appendChild(span)
        fontDict[font] = span
    })
    //return wait(50).then(() => {
        for (const key in fontDict) {
            if (fontDict.hasOwnProperty(key)) {
                const font = fontDict[key]
                if (!basicFontWidths.includes(font.offsetWidth))
                    fontWidthDict[key] = font.offsetWidth
            }
        }
        return fontWidthDict
    //})    
}

const getBasicFontWidthArray = (iframe: Document, div: HTMLElement): number[] => {
    let basicFontWidths: number[] = []
    basicFonts.forEach((font) => {
        const span = iframe.createElement('span')
        span.style.fontFamily = font
        span.textContent = 'mMwW0oOil1'
        div.appendChild(span)
        basicFontWidths.push(span.offsetWidth)
    })
    return basicFontWidths
}

includeComponent('fonts2', getFontMetrics);