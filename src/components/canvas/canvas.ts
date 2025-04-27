import { componentInterface, includeComponent } from '../../factory'
import { hash } from '../../utils/hash'
import { getCommonPixels } from '../../utils/commonPixels'
import { getBrowser } from '../system/browser'
import { runInIframe, ephemeralIFrame } from '../../utils/ephemeralIFrame'

//const _RUNS = (getBrowser().name !== 'SamsungBrowser') ? 1 : 3;


/**
 * A simple canvas finger printing function
 * 
 * @returns a CanvasInfo JSON object
 */

const _WIDTH = 280;
const _HEIGHT = 20;

export default function generateCanvasFingerprint(): Promise<componentInterface> {
    const _RUNS = canvasHasRenderingBias() ? 3 : 1
  
    return new Promise((resolve) => {

        /**
         * Since some browsers fudge with the canvas pixels to prevent fingerprinting, the following
         * creates the canvas three times if there is noise and getCommonPixels picks the most common byte for each
         * channel of each pixel.
         */
        
        const imageDatas = Array.from({ length: _RUNS }, () => runInIframe(generateCanvasImageData, {width: _WIDTH, height: _HEIGHT}));

        Promise.all(imageDatas).then((imageDatas) => {
            const commonImageData = getCommonPixels(imageDatas, _WIDTH, _HEIGHT);

            resolve(
                {
                    'commonImageDataHash': hash(commonImageData.data.toString()).toString(),
                }
            )            
        })
    });
}

function generateCanvasImageData(params: { width: number, height: number }): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return new ImageData(1,1);
    }

    // Set canvas dimensions
    canvas.width = params.width;
    canvas.height = params.height;

    // Create rainbow gradient for the background rectangle
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(1/6, "orange");
    gradient.addColorStop(2/6, "yellow");
    gradient.addColorStop(3/6, "green");
    gradient.addColorStop(4/6, "blue");
    gradient.addColorStop(5/6, "indigo");
    gradient.addColorStop(1, "violet");

    // Draw background rectangle with the rainbow gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some random text
    const randomText = 'Random Text WMwmil10Oo';
    ctx.font = '23.123px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(randomText, -5, 15);

    // Draw the same text with an offset, different color, and slight transparency
    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.fillText(randomText, -3.3, 17.7);

    // Draw a line crossing the image at an arbitrary angle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width * 2/7, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Return data URL of the canvas
    return imageData;
}

//if (getBrowser().name != 'Firefox')
includeComponent('canvas', generateCanvasFingerprint);

function canvasHasRenderingBias() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 8;
    canvas.height = 8;

    if(!ctx) {
        return true // if context isn't available, let's default to bias
    }
    ctx.fillStyle = 'rgba(127,127,127,1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const r0 = data[0];
    const g0 = data[1];
    const b0 = data[2];
    const a0 = data[3];

    for (let i = 4; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (r !== r0 || g !== g0 || b !== b0 || a !== a0) {
            return true; // Biased
        }
    }

    return false; // Not biased
}
    